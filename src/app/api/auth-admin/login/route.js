import { z } from "zod";
import { db } from "@/lib/db";
import { handle, ok, fail, rateLimit, clientIp } from "@/lib/api";
import { verifyPassword, createSession, isAdminRole } from "@/lib/auth";

const schema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

export const POST = handle(async (req) => {
  rateLimit(`admin-login:${clientIp(req)}`, 8, 60_000);
  const { email, password } = schema.parse(await req.json());
  const user = await db.user.findUnique({ where: { email } });
  // constant-ish timing: always run a bcrypt compare
  const valid = await verifyPassword(password, user?.passwordHash || "$2a$11$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva");
  if (!user || !valid) return fail("Invalid email or password", 401);
  if (!isAdminRole(user.role)) return fail("This account does not have admin access", 403);
  if (user.isBlocked) return fail("This account is blocked", 403);
  await createSession(user);
  return ok({ ok: true, user: { name: user.name, role: user.role } });
});
