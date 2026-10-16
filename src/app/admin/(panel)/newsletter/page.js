import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-api";
import NewsletterManager from "@/components/admin/newsletter/NewsletterManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Newsletter" };

const DAY = 86_400_000;
const PER = 50;

export default async function NewsletterPage({ searchParams }) {
  const user = await requireAdminPage();
  const sp = await searchParams;
  const q = String(sp.q || "").trim().slice(0, 120);
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const where = q ? { email: { contains: q, mode: "insensitive" } } : {};

  // IST day buckets for the last 30 days
  const now = Date.now();
  const IST = 330 * 60_000;
  const todayStartIst = Math.floor((now + IST) / DAY) * DAY - IST;
  const since = new Date(todayStartIst - 29 * DAY);
  const prevSince = new Date(since.getTime() - 30 * DAY);

  const [total, matching, rows, recent, prev30] = await Promise.all([
    db.newsletter.count(),
    db.newsletter.count({ where }),
    db.newsletter.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER }),
    db.newsletter.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    db.newsletter.count({ where: { createdAt: { gte: prevSince, lt: since } } }),
  ]);

  const series = Array.from({ length: 30 }, () => 0);
  for (const r of recent) {
    const i = Math.floor((r.createdAt.getTime() - since.getTime()) / DAY);
    if (i >= 0 && i < 30) series[i] += 1;
  }
  const last30 = recent.length;
  const last7 = series.slice(-7).reduce((a, b) => a + b, 0);

  return (
    <NewsletterManager
      subscribers={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
      stats={{ total, last30, prev30, last7, series, today: series[29] }}
      page={page}
      pages={Math.max(1, Math.ceil(matching / PER))}
      matching={matching}
      q={q}
      canDelete={user.role === "ADMIN"}
    />
  );
}
