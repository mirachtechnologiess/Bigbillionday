// Edge-safe JWT helpers (used by middleware and server code).
import { jwtVerify } from "jose";

export const SESSION_COOKIE = "ps_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export const authKey = () =>
  new TextEncoder().encode(process.env.AUTH_SECRET || "dev-insecure-secret-change-me");

export async function readToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, authKey());
    return payload;
  } catch {
    return null;
  }
}
