import { db } from "@/lib/db";
import { handle, ok, HttpError, rateLimit, clientIp } from "@/lib/api";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { profileSchema, changePasswordSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

/** GET /api/account/profile → { user: {id,name,email,phone} } */
export const GET = handle(async () => {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Please sign in");
  return ok({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
});

/**
 * PATCH /api/account/profile
 *   { name, phone }                       → { user }
 *   { currentPassword, newPassword }      → { ok: true }
 */
export const PATCH = handle(async (req) => {
  rateLimit(`profile:${clientIp(req)}`, 10, 60_000);
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Please sign in");
  const body = await req.json();

  if (body && "newPassword" in body) {
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);
    const row = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
    if (!(await verifyPassword(currentPassword, row.passwordHash))) throw new HttpError(400, "Your current password is incorrect");
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
    return ok({ ok: true });
  }

  const { name, phone } = profileSchema.parse(body);
  if (phone !== user.phone) {
    const taken = await db.user.findFirst({ where: { phone, id: { not: user.id } }, select: { id: true } });
    if (taken) throw new HttpError(409, "This mobile number is linked to another account");
  }
  const updated = await db.user.update({
    where: { id: user.id },
    data: { name, phone },
    select: { id: true, name: true, email: true, phone: true },
  });
  return ok({ user: updated });
});
