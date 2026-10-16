import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { fail, json, readJson, withUser } from "@/lib/http";
import { changePasswordSchema } from "@/lib/validation";

export const POST = withUser(async (user, req) => {
  const body = await readJson(req, changePasswordSchema);
  if ("response" in body) return body.response;
  const { currentPassword, newPassword } = body.data;

  const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(currentPassword, row.passwordHash))) {
    return fail("Your current password is incorrect.", 400, { fieldErrors: { currentPassword: "Incorrect password." } });
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
  return json({ ok: true });
});
