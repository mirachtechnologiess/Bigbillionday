import { requireAdminPage } from "@/lib/admin-api";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { aiEnabled } from "@/lib/ai";
import AiStudio from "@/components/admin/ai-studio/AiStudio";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI Studio" };

const TABS = ["photos", "seo", "reviews", "copy", "ask"];

export default async function AiStudioPage({ searchParams }) {
  await requireAdminPage();
  const sp = await searchParams;
  const tab = TABS.includes(sp?.tab) ? sp.tab : "photos";

  const [settings, pending, unclassified, latest] = await Promise.all([
    getSettings(),
    db.review.count({ where: { status: "PENDING" } }),
    db.review.count({ where: { sentiment: null } }),
    db.review.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, name: true, rating: true, title: true, body: true, sentiment: true, verified: true, createdAt: true, product: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <AiStudio
      initialTab={tab}
      aiOn={aiEnabled()}
      home={settings.home}
      autoModeration={Boolean(settings.ai?.autoReviewModeration)}
      reviews={{
        pending,
        unclassified,
        latest: latest.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      }}
    />
  );
}
