import { db } from "@/lib/db";
import { siteUrl } from "@/lib/utils";

// Generated per request from live data (cached by crawlers/CDN for 1h via the default sitemap headers).
export const dynamic = "force-dynamic";

const abs = (u) => (/^https?:\/\//.test(u) ? u : siteUrl(u.startsWith("/") ? u : `/${u}`));

export default async function sitemap() {
  const now = new Date();
  const statics = [
    ["/", 1, "daily"],
    ["/watches", 0.9, "daily"],
    ["/men", 0.8, "daily"],
    ["/women", 0.8, "daily"],
    ["/new-arrivals", 0.8, "daily"],
    ["/brands", 0.7, "weekly"],
    ["/collections", 0.7, "weekly"],
    ["/about", 0.4, "monthly"],
    ["/contact", 0.4, "monthly"],
    ["/faq", 0.4, "monthly"],
    ["/track-order", 0.3, "monthly"],
    ["/shipping-policy", 0.3, "yearly"],
    ["/return-policy", 0.3, "yearly"],
    ["/privacy-policy", 0.2, "yearly"],
    ["/terms", 0.2, "yearly"],
  ].map(([path, priority, changeFrequency]) => ({ url: siteUrl(path), lastModified: now, changeFrequency, priority }));

  let products = [];
  let brands = [];
  let categories = [];
  let collections = [];
  try {
    const active = { status: "ACTIVE" };
    [products, brands, categories, collections] = await Promise.all([
      db.product.findMany({
        where: active,
        select: { slug: true, updatedAt: true, images: { select: { url: true }, orderBy: { position: "asc" }, take: 5 } },
        orderBy: { updatedAt: "desc" },
        take: 45000,
      }),
      db.brand.findMany({ where: { products: { some: active } }, select: { slug: true, createdAt: true } }),
      db.category.findMany({ where: { products: { some: active } }, select: { slug: true } }),
      db.collection.findMany({ where: { isActive: true }, select: { slug: true } }),
    ]);
  } catch (e) {
    console.error("[sitemap]", e);
  }

  return [
    ...statics,
    ...products.map((p) => ({
      url: siteUrl(`/watches/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
      images: p.images.map((i) => abs(i.url)),
    })),
    ...brands.map((b) => ({ url: siteUrl(`/brands/${b.slug}`), lastModified: now, changeFrequency: "weekly", priority: 0.7 })),
    ...categories.map((c) => ({ url: siteUrl(`/category/${c.slug}`), lastModified: now, changeFrequency: "weekly", priority: 0.6 })),
    ...collections.map((c) => ({ url: siteUrl(`/collections/${c.slug}`), lastModified: now, changeFrequency: "weekly", priority: 0.6 })),
  ];
}
