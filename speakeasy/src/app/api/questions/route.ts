import { prisma } from "@/lib/db";
import { generateQuestions } from "@/lib/ai";
import { json, readJson, withUser } from "@/lib/http";
import { practiceAudienceSchema } from "@/lib/validation";

export const GET = withUser(async (user) => {
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { practicePurpose: true, practiceRole: true, practiceSpecs: true },
  });
  return json({ audience: { purpose: u.practicePurpose ?? "", role: u.practiceRole ?? "", specifications: u.practiceSpecs ?? "" } });
});

/** Generate a batch of ~10 questions for the given audience (and remember it for next time). */
export const POST = withUser(async (user, req) => {
  const body = await readJson(req, practiceAudienceSchema);
  if ("response" in body) return body.response;
  const { purpose, role, specifications } = body.data;
  await prisma.user.update({
    where: { id: user.id },
    data: { practicePurpose: purpose, practiceRole: role, practiceSpecs: specifications },
  });
  const questions = await generateQuestions(body.data, 10);
  return json({ questions });
});
