import { prisma } from "@/lib/db";
import { json, readJson, withUser } from "@/lib/http";
import { journalEntrySchema } from "@/lib/validation";

export const GET = withUser(async (user, req) => {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 200);
  const entries = await prisma.journalEntry.findMany({
    where: {
      userId: user.id,
      ...(q ? { OR: [{ prompt: { contains: q } }, { response: { contains: q } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, prompt: true, response: true, createdAt: true, updatedAt: true },
  });
  return json({ entries });
});

export const POST = withUser(async (user, req) => {
  const body = await readJson(req, journalEntrySchema);
  if ("response" in body) return body.response;
  const entry = await prisma.journalEntry.create({
    data: { userId: user.id, prompt: body.data.prompt, response: body.data.response },
    select: { id: true, prompt: true, response: true, createdAt: true, updatedAt: true },
  });
  return json({ entry }, 201);
});
