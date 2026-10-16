import { prisma } from "@/lib/db";
import { json, readJson, withUser } from "@/lib/http";
import { preferencesSchema } from "@/lib/validation";
import { addGeneratedTerms, getPreferences, getStats, NEW_TERMS_ON_PREF_CHANGE, TARGET_ACTIVE } from "@/lib/vocab";

export const GET = withUser(async (user) => {
  return json({ preferences: await getPreferences(user.id) });
});

/**
 * Save vocabulary preferences, then generate terms that match them.
 * First-time setup creates a full starting set; later changes add new terms and keep the old ones.
 * Preferences are saved even if generation fails, so the client can retry generation on its own.
 */
export const PUT = withUser(async (user, req) => {
  const body = await readJson(req, preferencesSchema);
  if ("response" in body) return body.response;
  const { level, field, audience } = body.data;

  const before = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { onboarded: true } });
  await prisma.user.update({
    where: { id: user.id },
    data: { vocabLevel: level, vocabField: field, vocabAudience: audience, onboarded: true },
  });

  const added = await addGeneratedTerms(user.id, before.onboarded ? NEW_TERMS_ON_PREF_CHANGE : TARGET_ACTIVE);
  return json({ preferences: body.data, added, stats: await getStats(user.id) });
});
