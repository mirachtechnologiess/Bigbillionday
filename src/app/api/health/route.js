import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Liveness: /api/health  ·  Readiness (checks DB): /api/health?ready=1
export async function GET(req) {
  if (new URL(req.url).searchParams.get("ready")) {
    try {
      await db.$queryRaw`SELECT 1`;
    } catch {
      return Response.json({ status: "db-unavailable" }, { status: 503 });
    }
  }
  return Response.json({ status: "ok", time: new Date().toISOString() });
}
