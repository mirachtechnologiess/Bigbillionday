import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { handle, HttpError, rateLimit } from "./api";
import { requireAdmin } from "./auth";
import { aiEnabled } from "./ai";

/**
 * Wrap an /api/admin route handler.
 *   export const POST = adminRoute(async (req, { params, user }) => ok(...), { role: "ADMIN", ai: true })
 * - always re-checks the session against the DB (defense in depth on top of middleware)
 * - role: "ADMIN" restricts destructive actions to ADMIN (STAFF gets 403)
 * - ai: true rate-limits to 30 req/min per admin and returns 503 when NVIDIA_API_KEY is absent
 * - params are awaited (Next 15) and passed resolved.
 */
export function adminRoute(fn, { role, ai = false, aiLimit = 30 } = {}) {
  return handle(async (req, ctx) => {
    const user = await requireAdmin();
    if (role === "ADMIN" && user.role !== "ADMIN") throw new HttpError(403, "Only an ADMIN can perform this action");
    if (ai) {
      if (!aiEnabled()) throw new HttpError(503, "AI is not configured — set NVIDIA_API_KEY");
      rateLimit(`ai:${user.id}`, aiLimit, 60_000);
    }
    const params = ctx?.params ? await ctx.params : {};
    return fn(req, { params, user });
  });
}

/** Throws 403 unless user is ADMIN. */
export function assertAdminRole(user) {
  if (user?.role !== "ADMIN") throw new HttpError(403, "Only an ADMIN can perform this action");
}

/** For admin Server Component pages: returns the user or redirects to login. */
export async function requireAdminPage() {
  try {
    return await requireAdmin();
  } catch {
    redirect("/admin/login");
  }
}

/** Parse a JSON body, optionally through a zod schema. */
export async function readJson(req, schema) {
  let body;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
  return schema ? schema.parse(body) : body;
}

/** Revalidate storefront pages that show catalog data. */
export function revalidateCatalog(slugs = []) {
  try {
    revalidateTag("catalog");
    revalidatePath("/");
    revalidatePath("/watches");
    for (const s of [].concat(slugs).filter(Boolean)) revalidatePath(`/watches/${s}`);
  } catch {}
}

export function revalidateLayout() {
  try {
    revalidateTag("settings");
    revalidateTag("catalog");
    revalidatePath("/", "layout");
  } catch {}
}

/** ?page=&per= helper. */
export function paging(searchParams, defPer = 25, maxPer = 100) {
  const page = Math.max(1, parseInt(searchParams.get?.("page") ?? searchParams.page ?? "1", 10) || 1);
  const per = Math.min(maxPer, Math.max(1, parseInt(searchParams.get?.("per") ?? searchParams.per ?? String(defPer), 10) || defPer));
  return { page, per, skip: (page - 1) * per, take: per };
}

/** RFC4180 CSV from array of objects. */
export function toCsv(rows, columns) {
  const cols = columns || Object.keys(rows[0] || {});
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    const s = Array.isArray(v) ? v.join("|") : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function csvResponse(csv, filename) {
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export { HttpError };
