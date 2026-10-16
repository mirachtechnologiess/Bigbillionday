import { db } from "@/lib/db";
import { handle, ok, HttpError, rateLimit, clientIp } from "@/lib/api";
import { hashPassword, createSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validators";

/** POST /api/auth/register { name, email, phone, password } → 201 { user: {id,name,email,role} } */
export const POST = handle(async (req) => {
  rateLimit(`register:${clientIp(req)}`, 10, 60_000);
  const { name, email, phone, password } = registerSchema.parse(await req.json());
  const clash = await db.user.findFirst({ where: { OR: [{ email }, { phone }] }, select: { email: true } });
  if (clash) {
    throw new HttpError(
      409,
      clash.email === email ? "An account with this email already exists. Try signing in." : "This mobile number is already registered."
    );
  }
  const user = await db.user.create({
    data: { name, email, phone, passwordHash: await hashPassword(password) },
    select: { id: true, name: true, email: true, role: true },
  });
  // Link earlier guest orders placed with the same email + phone
  await db.order.updateMany({ where: { userId: null, email, phone }, data: { userId: user.id } }).catch(() => {});
  await createSession(user);
  return ok({ user }, { status: 201 });
});
