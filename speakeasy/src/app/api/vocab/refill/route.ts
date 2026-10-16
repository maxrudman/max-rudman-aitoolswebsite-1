import { json, withUser } from "@/lib/http";
import { getStats, refillIfNeeded } from "@/lib/vocab";

/**
 * Generate replacement terms so the active set stays near its target size.
 * Called by the client in the background after a term retires or is removed,
 * and by the "Try again" button when the set is empty.
 */
export const POST = withUser(async (user, req) => {
  const force = new URL(req.url).searchParams.get("force") === "1";
  const added = await refillIfNeeded(user.id, force);
  return json({ added, stats: await getStats(user.id) });
});
