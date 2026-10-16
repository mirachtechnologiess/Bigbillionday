import "server-only";
import { db } from "./db";
import { revalidateCatalog } from "./admin-api";
import { aiClassifyReviews } from "./admin-ai";
import { getSettings } from "./settings";

/** Recompute Product.ratingAvg / ratingCount from APPROVED reviews and revalidate storefront pages. */
export async function recomputeRating(productIds) {
  const ids = [...new Set((productIds || []).filter(Boolean))];
  if (!ids.length) return;
  const stats = await db.review.groupBy({
    by: ["productId"],
    where: { productId: { in: ids }, status: "APPROVED" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const map = new Map(stats.map((s) => [s.productId, s]));
  const slugs = [];
  for (const id of ids) {
    const s = map.get(id);
    const ratingAvg = s?._avg.rating ? Math.round(s._avg.rating * 100) / 100 : 0;
    const ratingCount = s?._count._all || 0;
    const p = await db.product
      .update({ where: { id }, data: { ratingAvg, ratingCount }, select: { slug: true } })
      .catch(() => null);
    if (p) slugs.push(p.slug);
  }
  revalidateCatalog(slugs);
}

/** "negative|spam" → { sentiment: "negative", spam: true, abusive: false } */
export function parseSentiment(s) {
  const parts = String(s || "").split("|").filter(Boolean);
  return { sentiment: parts[0] || null, spam: parts.includes("spam"), abusive: parts.includes("abusive") };
}

/**
 * AI-classify reviews and (optionally) auto-moderate them.
 * - ids given → classify those; otherwise up to `limit` PENDING reviews without sentiment
 * - stores sentiment like "positive" or "negative|spam|abusive"
 * - when settings.ai.autoReviewModeration: spam/abusive → REJECTED, clean → APPROVED (only PENDING ones)
 */
export async function classifyAndModerate({ ids, limit = 40 } = {}) {
  const where = ids?.length ? { id: { in: ids.slice(0, limit) } } : { status: "PENDING", sentiment: null };
  const reviews = await db.review.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "asc" },
    select: { id: true, rating: true, title: true, body: true, status: true, productId: true },
  });
  const summary = { processed: 0, approved: 0, rejected: 0, flagged: 0 };
  if (!reviews.length) return summary;

  const settings = await getSettings();
  const auto = Boolean(settings.ai?.autoReviewModeration);
  const results = await aiClassifyReviews(reviews.map(({ id, rating, title, body }) => ({ id, rating, title, body })));
  const byId = new Map(reviews.map((r) => [r.id, r]));
  const changedProducts = new Set();

  for (const r of results) {
    const review = byId.get(r.id);
    if (!review) continue;
    const bad = r.spam || r.abusive;
    const sentiment = [r.sentiment, r.spam && "spam", r.abusive && "abusive"].filter(Boolean).join("|");
    const data = { sentiment };
    if (auto && review.status === "PENDING") {
      data.status = bad ? "REJECTED" : "APPROVED";
      if (bad) summary.rejected++;
      else summary.approved++;
      changedProducts.add(review.productId);
    }
    if (bad) summary.flagged++;
    await db.review.update({ where: { id: r.id }, data });
    summary.processed++;
  }
  if (changedProducts.size) await recomputeRating([...changedProducts]);
  return summary;
}
