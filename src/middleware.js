import { NextResponse } from "next/server";
import { SESSION_COOKIE, readToken } from "@/lib/session-token";

/**
 * Hosts (production): storefront on bigbillionday.store, admin panel on admin.bigbillionday.store.
 * Admin pages live under /admin/* in the app; on the admin host they are served at clean paths
 * (admin.bigbillionday.store/orders → /admin/orders) via an internal rewrite.
 * NEXT_PUBLIC_ADMIN_HOST is baked in at build time; when it's unset (local dev) /admin works as before.
 */
const ADMIN_HOST = (process.env.NEXT_PUBLIC_ADMIN_HOST || "").toLowerCase();
const SITE_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL || "").hostname.toLowerCase();
  } catch {
    return "";
  }
})();
// Never rewritten on the admin host: APIs, Next assets, uploaded media and static files (logo.png, icon.png…)
const PASSTHROUGH = /^\/(api|_next|uploads)(\/|$)|\.[a-z0-9]{2,5}$/i;

const isAdminPath = (p) => p === "/admin" || p.startsWith("/admin/");

function absolute(req, host, path) {
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}${path}`;
}

export async function middleware(req) {
  const { pathname, search } = req.nextUrl;
  const hostHeader = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").toLowerCase();
  const host = hostHeader.split(":")[0];
  const onAdminHost = Boolean(ADMIN_HOST) && host === ADMIN_HOST;

  const session = await readToken(req.cookies.get(SESSION_COOKIE)?.value);
  const isAdmin = session && (session.role === "ADMIN" || session.role === "STAFF");

  if (onAdminHost) {
    // Old-style /admin/... links (used throughout the admin UI) → clean URL on the admin host
    if (isAdminPath(pathname)) {
      return NextResponse.redirect(absolute(req, hostHeader, (pathname.slice(6) || "/") + search), 307);
    }
    if (!PASSTHROUGH.test(pathname)) {
      const logical = "/admin" + (pathname === "/" ? "" : pathname);
      if (logical !== "/admin/login" && !isAdmin) {
        const next = encodeURIComponent(logical + search);
        return NextResponse.redirect(absolute(req, hostHeader, `/login?next=${next}`), 307);
      }
      const res = NextResponse.rewrite(new URL(logical + search, req.url));
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      return res;
    }
  } else if (ADMIN_HOST && (host === SITE_HOST || host === `www.${SITE_HOST}`) && isAdminPath(pathname)) {
    // bigbillionday.store/admin/... → admin.bigbillionday.store/...
    return NextResponse.redirect(absolute(req, ADMIN_HOST, (pathname.slice(6) || "/") + search), 308);
  }

  if (pathname.startsWith("/api/admin")) {
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const res = NextResponse.next();
    if (onAdminHost) res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // Local / single-host mode: /admin/* protected in place
  if (isAdminPath(pathname) && pathname !== "/admin/login" && !isAdmin) {
    const url = new URL("/admin/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/account") && !session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Runs on every request except Next's static/image assets (host-based routing needs all paths).
  matcher: ["/((?!_next/static|_next/image).*)"],
};
