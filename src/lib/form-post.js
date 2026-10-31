import "server-only";
import { NextResponse } from "next/server";

/**
 * Helpers for progressive-enhancement form posts: if a visitor submits a form before the page's
 * JavaScript has loaded (common on slow connections to the US server), the browser sends a plain
 * HTML form POST. API routes that support it answer with a 303 redirect instead of JSON.
 */
export const isFormPost = (req) => /application\/x-www-form-urlencoded|multipart\/form-data/i.test(req.headers.get("content-type") || "");

/** The public origin of this request (Caddy forwards Host and X-Forwarded-Proto). */
export function requestOrigin(req) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || new URL(req.url).host;
  const proto = req.headers.get("x-forwarded-proto") || (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

export const redirect303 = (req, path) => NextResponse.redirect(`${requestOrigin(req)}${path}`, 303);

/** True when this request came in on the admin subdomain (admin.premiumshopy.com). */
export function onAdminHost(req) {
  const admin = (process.env.NEXT_PUBLIC_ADMIN_HOST || "").toLowerCase();
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(":")[0].toLowerCase();
  return Boolean(admin) && host === admin;
}
