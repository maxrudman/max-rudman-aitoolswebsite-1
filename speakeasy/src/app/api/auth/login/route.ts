import { prisma } from "@/lib/db";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { errorResponse, fail, json, readJson } from "@/lib/http";
import { loginSchema } from "@/lib/validation";

// Compare against a real hash when the username doesn't exist, so response time doesn't reveal it.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password"));

export async function POST(req: Request) {
  try {
    const body = await readJson(req, loginSchema);
    if ("response" in body) return body.response;
    const { username, password } = body.data;

    const rows = await prisma.$queryRaw<{ id: string; passwordHash: string }[]>`
      SELECT id, passwordHash FROM "User" WHERE lower(username) = lower(${username}) LIMIT 1`;
    const user = rows[0];
    const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
    if (!user || !ok) return fail("That username and password don't match.", 401);

    await createSession(user.id);
    return json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
