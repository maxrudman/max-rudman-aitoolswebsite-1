import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { errorResponse, fail, json, readJson } from "@/lib/http";
import { signupSchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const body = await readJson(req, signupSchema);
    if ("response" in body) return body.response;
    const { username, password } = body.data;

    if (await usernameTakenIgnoringCase(username)) {
      return fail("That username is taken. Try another.", 409, { fieldErrors: { username: "That username is taken." } });
    }
    const user = await prisma.user.create({ data: { username, passwordHash: await hashPassword(password) } });
    await createSession(user.id);
    return json({ ok: true }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}

async function usernameTakenIgnoringCase(username: string) {
  const rows = await prisma.$queryRaw<{ n: number }[]>`SELECT COUNT(*) as n FROM "User" WHERE lower(username) = lower(${username})`;
  return Number(rows[0]?.n ?? 0) > 0;
}
