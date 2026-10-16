import { db } from "@/lib/db";
import { requireAdminPage, paging } from "@/lib/admin-api";
import { aiEnabled } from "@/lib/ai";
import ReviewsList from "@/components/admin/reviews/ReviewsList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reviews" };

const STATUSES = ["PENDING", "APPROVED", "REJECTED"];

export default async function ReviewsPage({ searchParams }) {
  const me = await requireAdminPage();
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status) ? sp.status : sp.status === "ALL" ? null : "PENDING";
  const rating = parseInt(sp.rating, 10);
  const q = String(sp.q || "").trim();
  const flag = ["spam", "abusive", "negative", "unclassified"].includes(sp.flag) ? sp.flag : null;
  const { page, per, skip, take } = paging(sp, 25);

  const base = {
    ...(rating >= 1 && rating <= 5 ? { rating } : {}),
    ...(flag === "unclassified" ? { sentiment: null } : flag ? { sentiment: { contains: flag } } : {}),
    ...(q
      ? {
          OR: [
            { body: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { product: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const where = { ...base, ...(status ? { status } : {}) };

  const [reviews, total, grouped, unclassifiedPending] = await Promise.all([
    db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        product: { select: { id: true, name: true, slug: true, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } } },
        user: { select: { id: true } },
      },
    }),
    db.review.count({ where }),
    db.review.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
    db.review.count({ where: { status: "PENDING", sentiment: null } }),
  ]);

  const counts = { ALL: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 };
  for (const g of grouped) {
    counts[g.status] = g._count._all;
    counts.ALL += g._count._all;
  }

  const rows = reviews.map((r) => ({
    id: r.id,
    name: r.name,
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    verified: r.verified,
    sentiment: r.sentiment,
    userId: r.user?.id || null,
    createdAt: r.createdAt.toISOString(),
    product: { id: r.product.id, name: r.product.name, slug: r.product.slug, image: r.product.images[0]?.url || null },
  }));

  return (
    <ReviewsList
      status={status || "ALL"}
      rows={rows}
      counts={counts}
      page={page}
      pages={Math.max(1, Math.ceil(total / per))}
      total={total}
      aiOn={aiEnabled()}
      unclassified={unclassifiedPending}
      isAdmin={me.role === "ADMIN"}
    />
  );
}
