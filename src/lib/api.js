import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export const ok = (data, init) => NextResponse.json(data, init);
export const fail = (error, status = 400, extra) => NextResponse.json({ error, ...extra }, { status });

/**
 * Wrap a route handler: converts thrown errors into JSON responses.
 * Usage: export const POST = handle(async (req, ctx) => ok({...}))
 */
export function handle(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ZodError) return fail("Validation failed", 422, { issues: e.flatten().fieldErrors });
      if (e?.status) return fail(e.message, e.status);
      if (e?.code === "P2002") return fail(`Already exists: ${e.meta?.target?.join?.(", ") || "duplicate value"}`, 409);
      if (e?.code === "P2025") return fail("Not found", 404);
      console.error("[api]", e);
      return fail(process.env.NODE_ENV === "production" ? "Something went wrong" : e.message, 500);
    }
  };
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Naive in-memory rate limiter (per pod). Good enough for login/AI abuse protection. */
const buckets = new Map();
export function rateLimit(key, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  if (++b.count > limit) throw new HttpError(429, "Too many requests. Please slow down.");
}

export const clientIp = (req) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
