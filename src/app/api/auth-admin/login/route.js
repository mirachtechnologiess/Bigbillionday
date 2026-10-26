import { z } from "zod";
import { db } from "@/lib/db";
import { handle, ok, fail, rateLimit, clientIp } from "@/lib/api";
import { verifyPassword, createSession, isAdminRole } from "@/lib/auth";
import { isFormPost, onAdminHost, redirect303 } from "@/lib/form-post";

const schema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

/** Returns { user } or { code } where code ∈ invalid | noaccess | blocked. */
async function authenticate(email, password) {
  const user = await db.user.findUnique({ where: { email } });
  // constant-ish timing: always run a bcrypt compare
  const valid = await verifyPassword(password, user?.passwordHash || "$2a$11$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva");
  if (!user || !valid) return { code: "invalid" };
  if (!isAdminRole(user.role)) return { code: "noaccess" };
  if (user.isBlocked) return { code: "blocked" };
  return { user };
}

const MESSAGES = {
  invalid: "Invalid email or password",
  noaccess: "This account does not have admin access",
  blocked: "This account is blocked",
};

/**
 * Plain HTML form fallback (submitted before the page's JS loaded): sign in and redirect to the
 * dashboard, or back to the login page with ?error=<code>.
 */
async function formLogin(req) {
  const admin = onAdminHost(req);
  const fd = await req.formData();
  let next = String(fd.get("next") || "/admin");
  if (!(next === "/admin" || next.startsWith("/admin/")) || next.startsWith("//")) next = "/admin";
  const loginPath = admin ? "/login" : "/admin/login";
  const back = (code) => redirect303(req, `${loginPath}?error=${code}&next=${encodeURIComponent(next)}`);
  try {
    rateLimit(`admin-login:${clientIp(req)}`, 8, 60_000);
  } catch {
    return back("ratelimit");
  }
  const parsed = schema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return back("invalid");
  const { user, code } = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) return back(code);
  await createSession(user);
  return redirect303(req, admin ? next.slice(6) || "/" : next);
}

export const POST = handle(async (req) => {
  if (isFormPost(req)) return formLogin(req);
  rateLimit(`admin-login:${clientIp(req)}`, 8, 60_000);
  const { email, password } = schema.parse(await req.json());
  const { user, code } = await authenticate(email, password);
  if (!user) return fail(MESSAGES[code], code === "invalid" ? 401 : 403);
  await createSession(user);
  return ok({ ok: true, user: { name: user.name, role: user.role } });
});
