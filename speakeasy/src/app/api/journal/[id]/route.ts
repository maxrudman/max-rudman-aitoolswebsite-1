import { prisma } from "@/lib/db";
import { fail, json, readJson, withUser } from "@/lib/http";
import { journalEntrySchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withUser<Ctx>(async (user, req, { params }) => {
  const { id } = await params;
  const body = await readJson(req, journalEntrySchema);
  if ("response" in body) return body.response;
  const res = await prisma.journalEntry.updateMany({ where: { id, userId: user.id }, data: body.data });
  if (res.count === 0) return fail("That entry wasn't found.", 404);
  const entry = await prisma.journalEntry.findUnique({
    where: { id },
    select: { id: true, prompt: true, response: true, createdAt: true, updatedAt: true },
  });
  return json({ entry });
});

export const DELETE = withUser<Ctx>(async (user, _req, { params }) => {
  const { id } = await params;
  const res = await prisma.journalEntry.deleteMany({ where: { id, userId: user.id } });
  if (res.count === 0) return fail("That entry wasn't found.", 404);
  return json({ ok: true });
});
