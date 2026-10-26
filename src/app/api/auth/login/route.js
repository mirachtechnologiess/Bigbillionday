import { db } from "@/lib/db";
import { handle, ok, HttpError, rateLimit, clientIp } from "@/lib/api";
import { verifyPassword, createSession } from "@/lib/auth";
import { loginSchema, normalizePhone, safeNext } from "@/lib/validators";
import { isFormPost, redirect303 } from "@/lib/form-post";

/** Plain HTML form fallback (submitted before JS loaded): redirect instead of JSON. */
async function formLogin(req) {
  const fd = await req.formData();
  const next = safeNext(String(fd.get("next") || "")) || "/account";
  const back = (code) => redirect303(req, `/login?error=${code}&next=${encodeURIComponent(next)}`);
  try {
    rateLimit(`login:${clientIp(req)}`, 10, 60_000);
    const user = await authenticate(String(fd.get("identifier") || ""), String(fd.get("password") || ""));
    await createSession(user);
    return redirect303(req, next);
  } catch (e) {
    return back(e?.status === 429 ? "ratelimit" : e?.status === 403 ? "blocked" : "invalid");
  }
}

async function authenticate(rawIdentifier, rawPassword) {
  const { identifier, password } = loginSchema.parse({ identifier: rawIdentifier, password: rawPassword });
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
  return user;
}

/** POST /api/auth/login { identifier (email or 10-digit mobile), password } → { user: {id,name,email,role} } */
export const POST = handle(async (req) => {
  if (isFormPost(req)) return formLogin(req);
  rateLimit(`login:${clientIp(req)}`, 10, 60_000);
  const body = await req.json();
  const user = await authenticate(body?.identifier, body?.password);
  await createSession(user);
  return ok({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
