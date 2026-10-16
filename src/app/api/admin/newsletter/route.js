import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-api";

/** GET ?q= → { subscribers, total }   |   GET ?emails=1 → { emails: [all] } (for "copy all"). */
export const GET = adminRoute(async (req) => {
  const sp = new URL(req.url).searchParams;
  if (sp.get("emails")) {
    const rows = await db.newsletter.findMany({ orderBy: { createdAt: "desc" }, select: { email: true } });
    return ok({ emails: rows.map((r) => r.email) });
  }
  const q = (sp.get("q") || "").trim().slice(0, 120);
  const where = q ? { email: { contains: q, mode: "insensitive" } } : {};
  const [subscribers, total] = await Promise.all([db.newsletter.findMany({ where, orderBy: { createdAt: "desc" }, take: 500 }), db.newsletter.count()]);
  return ok({ subscribers, total });
});
