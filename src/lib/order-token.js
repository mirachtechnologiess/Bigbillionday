import "server-only";
import crypto from "node:crypto";

const secret = () => process.env.AUTH_SECRET || "dev-insecure-secret-change-me";

/** Signed, URL-safe token that lets a guest open their own order page. */
export function orderToken(orderNumber) {
  return crypto.createHmac("sha256", secret()).update(`order:${orderNumber}`).digest("base64url").slice(0, 32);
}

export function verifyOrderToken(orderNumber, token) {
  if (!orderNumber || typeof token !== "string" || token.length !== 32) return false;
  const a = Buffer.from(orderToken(orderNumber));
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
