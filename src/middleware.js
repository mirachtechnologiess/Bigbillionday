import { NextResponse } from "next/server";
import { SESSION_COOKIE, readToken } from "@/lib/session-token";

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const session = await readToken(req.cookies.get(SESSION_COOKIE)?.value);
  const isAdmin = session && (session.role === "ADMIN" || session.role === "STAFF");

  if (pathname.startsWith("/api/admin")) {
    if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!isAdmin) {
      const url = new URL("/admin/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/account") && !session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/account/:path*"],
};
