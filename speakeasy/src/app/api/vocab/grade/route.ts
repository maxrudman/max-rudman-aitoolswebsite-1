import { fail, json, readJson, withUser } from "@/lib/http";
import { gradeSchema } from "@/lib/validation";
import { getStats, gradeTerm, needsRefill, pickNextCard } from "@/lib/vocab";

export const POST = withUser(async (user, req) => {
  const body = await readJson(req, gradeSchema);
  if ("response" in body) return body.response;
  const result = await gradeTerm(user.id, body.data.termId, body.data.correct);
  if (!result) return fail("That term is no longer in your set.", 404);
  const [card, stats, refill] = await Promise.all([
    pickNextCard(user.id, body.data.termId),
    getStats(user.id),
    needsRefill(user.id),
  ]);
  return json({ result, card, stats, needsRefill: refill });
});
