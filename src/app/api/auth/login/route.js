import { db } from "@/lib/db";
import { handle, ok, HttpError, rateLimit, clientIp } from "@/lib/api";
import { verifyPassword, createSession } from "@/lib/auth";
import { loginSchema, normalizePhone } from "@/lib/validators";

/** POST /api/auth/login { identifier (email or 10-digit mobile), password } → { user: {id,name,email,role} } */
export const POST = handle(async (req) => {
  rateLimit(`login:${clientIp(req)}`, 10, 60_000);
  const { identifier, password } = loginSchema.parse(await req.json());
  const isEmail = identifier.includes("@");
  const phone = normalizePhone(identifier);
  if (!isEmail && !/^[6-9]\d{9}$/.test(phone)) throw new HttpError(400, "Enter a valid email or 10-digit mobile number");
  const user = await db.user.findUnique({
    where: isEmail ? { email: identifier.toLowerCase() } : { phone },
    select: { id: true, name: true, email: true, role: true, passwordHash: true, isBlocked: true },
  });
  // Always run bcrypt to keep timing similar for unknown accounts
  const valid = await verifyPassword(password, user?.passwordHash || "$2a$11$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
  if (!user || !valid) throw new HttpError(401, "That email/mobile and password don't match");
  if (user.isBlocked) throw new HttpError(403, "This account is disabled. Please contact support.");
  await createSession(user);
  return ok({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
