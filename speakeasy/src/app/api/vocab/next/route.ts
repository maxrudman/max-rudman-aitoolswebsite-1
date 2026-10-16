import { prisma } from "@/lib/db";
import { json, withUser } from "@/lib/http";
import { getPreferences, getStats, needsRefill, pickNextCard } from "@/lib/vocab";

/** Everything the Vocabulary page needs on load: onboarding status, preferences, stats, and the next card. */
export const GET = withUser(async (user) => {
  const { onboarded } = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { onboarded: true } });
  if (!onboarded) return json({ onboarded: false });
  const [preferences, stats, card, refill] = await Promise.all([
    getPreferences(user.id),
    getStats(user.id),
    pickNextCard(user.id),
    needsRefill(user.id),
  ]);
  return json({ onboarded: true, preferences, stats, card, needsRefill: refill });
});
