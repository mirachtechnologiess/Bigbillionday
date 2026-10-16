import { db } from "@/lib/db";
import { adminRoute, toCsv, csvResponse } from "@/lib/admin-api";

export const GET = adminRoute(async () => {
  const rows = await db.newsletter.findMany({ orderBy: { createdAt: "desc" } });
  const csv = toCsv(
    rows.map((r) => ({ email: r.email, subscribedAt: r.createdAt.toISOString() })),
    ["email", "subscribedAt"]
  );
  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(csv, `newsletter-subscribers-${stamp}.csv`);
});
