import "server-only";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { SESSION_COOKIE, SESSION_MAX_AGE, authKey, readToken } from "./session-token";

export const hashPassword = (pw) => bcrypt.hash(pw, 11);
export const verifyPassword = (pw, hash) => bcrypt.compare(pw, hash);

export async function createSession(user) {
  const token = await new SignJWT({ sub: user.id, role: user.role, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(authKey());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Lightweight session (JWT only, no DB hit). */
export async function getSession() {
  const jar = await cookies();
  return readToken(jar.get(SESSION_COOKIE)?.value);
}

/** Full user from DB, or null. */
export async function getCurrentUser() {
  const s = await getSession();
  if (!s?.sub) return null;
  const user = await db.user.findUnique({
    where: { id: s.sub },
    select: { id: true, name: true, email: true, phone: true, role: true, isBlocked: true },
  });
  return user && !user.isBlocked ? user : null;
}

export const isAdminRole = (role) => role === "ADMIN" || role === "STAFF";

/** Throws a 401-tagged error unless the caller is ADMIN/STAFF. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return user;
}
