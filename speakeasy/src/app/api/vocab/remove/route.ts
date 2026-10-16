import { fail, json, readJson, withUser } from "@/lib/http";
import { termIdSchema } from "@/lib/validation";
import { getStats, needsRefill, pickNextCard, removeTerm } from "@/lib/vocab";

export const POST = withUser(async (user, req) => {
  const body = await readJson(req, termIdSchema);
  if ("response" in body) return body.response;
  if (!(await removeTerm(user.id, body.data.termId))) return fail("That term wasn't found.", 404);
  const [card, stats, refill] = await Promise.all([
    pickNextCard(user.id, body.data.termId),
    getStats(user.id),
    needsRefill(user.id),
  ]);
  return json({ card, stats, needsRefill: refill });
});
