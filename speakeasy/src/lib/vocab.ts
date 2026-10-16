import "server-only";
import { prisma } from "./db";
import { AIError, generateTerms } from "./ai";
import { normalizeWord, preferencesSchema, type Preferences } from "./validation";

/** Leitner settings. */
export const TARGET_ACTIVE = 15; // size of the active study set
export const REFILL_BELOW = 13; // top the set back up once it drops below this
export const MASTERY_BOX = 5; // reaching this box retires a term
export const REVIEW_EVERY = 15; // roughly 1 in 15 cards is a retired-term review
export const NEW_TERMS_ON_PREF_CHANGE = 10;
// How strongly each box is weighted when picking the next card (box 0 appears 16x as often as box 4).
const BOX_WEIGHTS = [16, 8, 4, 2, 1];

export type CardDTO = {
  id: string;
  word: string;
  definition: string;
  example: string;
  box: number;
  isNew: boolean; // first time the user sees it
  isReview: boolean; // a retired (mastered) term coming back for review
};

export type StatsDTO = { active: number; retired: number; streak: number; bestStreak: number };

type TermRow = {
  id: string;
  word: string;
  definition: string;
  example: string;
  box: number;
  seen: boolean;
  retired: boolean;
  lastSeenAt: Date | null;
};

const toCard = (t: TermRow): CardDTO => ({
  id: t.id,
  word: t.word,
  definition: t.definition,
  example: t.example,
  box: t.box,
  isNew: !t.seen,
  isReview: t.retired,
});

export async function getStats(userId: string): Promise<StatsDTO> {
  const [active, retired, user] = await Promise.all([
    prisma.term.count({ where: { userId, removed: false, retired: false } }),
    prisma.term.count({ where: { userId, removed: false, retired: true } }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { currentStreak: true, bestStreak: true } }),
  ]);
  return { active, retired, streak: user.currentStreak, bestStreak: user.bestStreak };
}

/** Pick the next card. `avoidId` keeps the same card from appearing twice in a row. */
export async function pickNextCard(userId: string, avoidId?: string): Promise<CardDTO | null> {
  const select = { id: true, word: true, definition: true, example: true, box: true, seen: true, retired: true, lastSeenAt: true };
  const [user, active, retired] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { cardsShown: true } }),
    prisma.term.findMany({ where: { userId, removed: false, retired: false }, select }),
    prisma.term.findMany({ where: { userId, removed: false, retired: true }, select, orderBy: { lastSeenAt: "asc" } }),
  ]);

  // Occasional review of a mastered term (the one not seen for the longest), or when nothing else is left.
  const reviewDue = (user.cardsShown + 1) % REVIEW_EVERY === 0;
  const reviewable = retired.filter((t) => t.id !== avoidId);
  if (reviewable.length && (reviewDue || active.length === 0)) return toCard(reviewable[0]);
  if (active.length === 0) return retired[0] ? toCard(retired[0]) : null;

  const pool = active.length > 1 ? active.filter((t) => t.id !== avoidId) : active;
  const weights = pool.map((t) => BOX_WEIGHTS[Math.min(t.box, BOX_WEIGHTS.length - 1)]);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return toCard(pool[i]);
  }
  return toCard(pool[pool.length - 1]);
}

/** Apply a right/wrong answer using Leitner rules. Grading an unseen term also counts as "Keep". */
export async function gradeTerm(userId: string, termId: string, correct: boolean) {
  const term = await prisma.term.findFirst({ where: { id: termId, userId, removed: false } });
  if (!term) return null;

  let { box, retired } = term;
  if (correct) {
    box = Math.min(box + 1, MASTERY_BOX);
    if (box >= MASTERY_BOX) retired = true;
  } else if (retired) {
    retired = false; // a missed review sends the term back into rotation
    box = 1;
  } else {
    box = box >= 3 ? 1 : 0;
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { currentStreak: true, bestStreak: true } });
  const streak = correct ? user.currentStreak + 1 : 0;

  await prisma.$transaction([
    prisma.term.update({
      where: { id: term.id },
      data: {
        box,
        retired,
        seen: true,
        lastSeenAt: new Date(),
        timesRight: { increment: correct ? 1 : 0 },
        timesWrong: { increment: correct ? 0 : 1 },
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { cardsShown: { increment: 1 }, currentStreak: streak, bestStreak: Math.max(user.bestStreak, streak) },
    }),
  ]);
  return { box, retired, justRetired: retired && !term.retired };
}

/** Remove a term from the set. The row stays (flagged) so it is never generated again. */
export async function removeTerm(userId: string, termId: string) {
  const res = await prisma.term.updateMany({ where: { id: termId, userId }, data: { removed: true } });
  return res.count > 0;
}

export async function getPreferences(userId: string): Promise<Preferences | null> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { vocabLevel: true, vocabField: true, vocabAudience: true },
  });
  const parsed = preferencesSchema.safeParse({ level: user.vocabLevel, field: user.vocabField, audience: user.vocabAudience });
  return parsed.success ? parsed.data : null;
}

// One generation at a time per user, so double clicks or parallel refills don't create duplicate batches.
const inFlight = new Map<string, Promise<number>>();

/** Generate `count` new terms for the user and save them. Returns how many were added. */
export function addGeneratedTerms(userId: string, count: number): Promise<number> {
  const running = inFlight.get(userId);
  if (running) return running;
  const job = (async () => {
    const prefs = await getPreferences(userId);
    if (!prefs) throw new AIError("Set your vocabulary preferences first.", 400, false);
    const existing = await prisma.term.findMany({ where: { userId }, select: { word: true }, orderBy: { createdAt: "asc" } });
    const generated = await generateTerms(prefs, count, existing.map((t) => t.word));
    let added = 0;
    for (const t of generated) {
      try {
        await prisma.term.create({
          data: { userId, word: t.term, wordKey: normalizeWord(t.term), definition: t.definition, example: t.example },
        });
        added++;
      } catch {
        // Unique constraint: the user already has this word. Skip it.
      }
    }
    return added;
  })().finally(() => inFlight.delete(userId));
  inFlight.set(userId, job);
  return job;
}

/** Top the active set back up to TARGET_ACTIVE when it has fallen below REFILL_BELOW. */
export async function refillIfNeeded(userId: string, force = false) {
  const active = await prisma.term.count({ where: { userId, removed: false, retired: false } });
  if (!force && active >= REFILL_BELOW) return 0;
  const missing = Math.max(TARGET_ACTIVE - active, force ? 5 : 0);
  if (missing === 0) return 0;
  return addGeneratedTerms(userId, missing);
}

export async function needsRefill(userId: string) {
  const active = await prisma.term.count({ where: { userId, removed: false, retired: false } });
  return active < REFILL_BELOW;
}
