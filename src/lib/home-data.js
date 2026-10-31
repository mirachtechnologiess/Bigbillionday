import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "./db";
import { cardSelect } from "./catalog";

// Homepage merchandising queries. Cached in the Next data cache under the "catalog" tag so admin
// edits (revalidateTag("catalog")) refresh them. Everything returned is plain JSON (no Dates).
const cached = (fn, key, revalidate = 120) => unstable_cache(fn, [key], { tags: ["catalog"], revalidate });

const ACTIVE = { status: "ACTIVE" };
// floor + cap so "up to X%" never overstates (99.9% reads as 99%).
const pct = (price, mrp) => (mrp > price ? Math.min(99, Math.floor(((mrp - price) / mrp) * 100)) : 0);
const img = (p) => p?.images?.[0] || null;

/** Small product shape used by banners / tiles. */
const mini = (p) =>
  p
    ? {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        mrp: p.mrp,
        off: pct(p.price, p.mrp),
        brand: p.brand?.name || null,
        image: img(p),
      }
    : null;

/** Products ordered by discount % (computed in SQL — Prisma can't order by an expression). */
async function topDiscountIds(take, where = "") {
  const rows = await db.$queryRawUnsafe(
    `SELECT id FROM "Product" WHERE status = 'ACTIVE' AND mrp > price ${where}
     ORDER BY (mrp - price)::float / NULLIF(mrp, 0) DESC, "soldCount" DESC LIMIT ${Number(take) | 0}`
  );
  return rows.map((r) => r.id);
}

async function byIds(ids) {
  if (!ids.length) return [];
  const rows = await db.product.findMany({ where: { ...ACTIVE, id: { in: ids } }, select: cardSelect });
  const map = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => map.get(id)).filter(Boolean);
}

/**
 * Everything the retail homepage needs beyond getHomeData(): deals, price bands, category and brand
 * tiles (each with a representative real product photo), smart-watch / accessory rails.
 */
export const getHomeMerch = cache(
  cached(async () => {
    const [dealIds, cheapest, smart, accessories, categories, brands, catPhotos, brandPhotos, range, genderPhotos, newCount] =
      await Promise.all([
        topDiscountIds(16),
        db.product.findMany({ where: ACTIVE, select: cardSelect, orderBy: [{ price: "asc" }, { soldCount: "desc" }], take: 12 }),
        db.product.findMany({
          where: { ...ACTIVE, category: { slug: "smart-watches" } },
          select: cardSelect,
          orderBy: [{ isBestSeller: "desc" }, { soldCount: "desc" }, { createdAt: "desc" }],
          take: 12,
        }),
        db.product.findMany({
          where: { ...ACTIVE, category: { slug: "accessories" } },
          select: cardSelect,
          orderBy: [{ isBestSeller: "desc" }, { soldCount: "desc" }, { createdAt: "desc" }],
          take: 12,
        }),
        db.category.findMany({
          where: { parentId: null, products: { some: ACTIVE } },
          select: { id: true, name: true, slug: true, image: true, _count: { select: { products: { where: ACTIVE } } } },
          orderBy: { sortOrder: "asc" },
        }),
        db.brand.findMany({
          where: { products: { some: ACTIVE } },
          select: { id: true, name: true, slug: true, logo: true, isFeatured: true, _count: { select: { products: { where: ACTIVE } } } },
        }),
        db.product.findMany({
          where: { ...ACTIVE, categoryId: { not: null }, images: { some: {} } },
          distinct: ["categoryId"],
          orderBy: [{ isBestSeller: "desc" }, { soldCount: "desc" }, { createdAt: "desc" }],
          select: { categoryId: true, images: cardSelect.images },
        }),
        db.product.findMany({
          where: { ...ACTIVE, images: { some: {} } },
          distinct: ["brandId"],
          orderBy: [{ isBestSeller: "desc" }, { soldCount: "desc" }, { createdAt: "desc" }],
          select: { brandId: true, images: cardSelect.images },
        }),
        db.product.groupBy({ by: ["brandId"], where: ACTIVE, _min: { price: true }, _max: { mrp: true } }),
        db.product.findMany({
          where: { ...ACTIVE, gender: { in: ["MEN", "WOMEN"] }, images: { some: {} } },
          distinct: ["gender"],
          orderBy: [{ isBestSeller: "desc" }, { soldCount: "desc" }],
          select: { gender: true, images: cardSelect.images },
        }),
        db.product.count({ where: { ...ACTIVE, isNewArrival: true } }),
      ]);

    const deals = await byIds(dealIds);

    const catPhoto = new Map(catPhotos.map((r) => [r.categoryId, r.images[0] || null]));
    const categoryTiles = categories.map((c) => ({
      name: c.name,
      slug: c.slug,
      count: c._count.products,
      image: c.image ? { url: c.image, alt: c.name } : catPhoto.get(c.id) || null,
    }));

    const brandPhoto = new Map(brandPhotos.map((r) => [r.brandId, r.images[0] || null]));
    const brandMin = new Map(range.map((r) => [r.brandId, r._min.price]));
    const brandTiles = brands
      .map((b) => ({
        name: b.name,
        slug: b.slug,
        logo: b.logo || null,
        count: b._count.products,
        minPrice: brandMin.get(b.id) ?? null,
        image: brandPhoto.get(b.id) || null,
        featured: b.isFeatured,
      }))
      .sort((a, b) => b.count - a.count || Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name));

    // Price bands from the real price range.
    const prices = await db.product.findMany({ where: ACTIVE, select: { price: true } });
    const priceBands = buildBands(prices.map((p) => p.price));

    // Featured brand for the ad carousel: the biggest real brand (skip the house label).
    const topBrand = brandTiles.find((b) => !/^premium-?shopy-select$/.test(b.slug) && b.count >= 3) || null;
    const topBrandProducts = topBrand
      ? await db.product.findMany({
          where: { ...ACTIVE, brand: { slug: topBrand.slug }, images: { some: {} } },
          select: cardSelect,
          orderBy: [{ isBestSeller: "desc" }, { soldCount: "desc" }, { price: "asc" }],
          take: 3,
        })
      : [];

    return {
      deals,
      maxDiscount: deals.length ? pct(deals[0].price, deals[0].mrp) : 0,
      cheapest,
      smart,
      accessories,
      categoryTiles,
      brandTiles,
      priceBands,
      genderImages: Object.fromEntries(genderPhotos.map((g) => [g.gender, g.images[0] || null])),
      newCount,
      topBrand: topBrand ? { ...topBrand, products: topBrandProducts } : null,
    };
  }, "home-merch")
);

/** Three (or fewer) honest bands: ≤ ₹999, ₹1,000–1,499, ₹1,500+ — adapted when the range is different. */
function buildBands(prices) {
  if (!prices.length) return [];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  let cuts;
  if (min <= 999 && max >= 1500) cuts = [999, 1499];
  else {
    // Generic: split the range into thirds, rounded to tidy ₹…99 values.
    const step = (max - min) / 3;
    const tidy = (n) => Math.max(99, Math.round(n / 100) * 100 - 1);
    cuts = [...new Set([tidy(min + step), tidy(min + 2 * step)])].filter((c) => c > min && c < max);
  }
  const edges = [null, ...cuts, null];
  const bands = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const lo = edges[i] == null ? null : edges[i] + 1;
    const hi = edges[i + 1];
    const count = prices.filter((p) => (lo == null || p >= lo) && (hi == null || p <= hi)).length;
    if (!count) continue;
    const from = lo == null ? null : prices.filter((p) => p >= lo && (hi == null || p <= hi)).reduce((a, b) => Math.min(a, b), Infinity);
    bands.push({ min: lo, max: hi, count, from: lo == null ? min : from });
  }
  return bands;
}

/** Raw active banners for a placement (dates as ISO strings; window filtering happens per request). */
const getBannerRows = cached(async (placement) => {
  const rows = await db.banner.findMany({
    where: { placement, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 12,
  });
  const ids = [...new Set(rows.map((r) => r.productId).filter(Boolean))];
  const products = ids.length ? await db.product.findMany({ where: { ...ACTIVE, id: { in: ids } }, select: cardSelect }) : [];
  const pmap = new Map(products.map((p) => [p.id, mini(p)]));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    subtitle: r.subtitle,
    image: r.image,
    ctaLabel: r.ctaLabel,
    ctaHref: r.ctaHref,
    badge: r.badge,
    theme: r.theme,
    product: r.productId ? pmap.get(r.productId) || null : null,
    startsAt: r.startsAt ? r.startsAt.toISOString() : null,
    endsAt: r.endsAt ? r.endsAt.toISOString() : null,
  }));
}, "home-banners");

export const getHomeBanners = cache(async (placement = "home_hero") => {
  const rows = await getBannerRows(placement);
  const now = Date.now();
  return rows.filter((r) => (!r.startsAt || Date.parse(r.startsAt) <= now) && (!r.endsAt || Date.parse(r.endsAt) >= now));
});

const THEMES = ["saffron", "teal", "crimson", "sun", "forest", "ink"];
const fmt = (n) => "₹" + new Intl.NumberFormat("en-IN").format(n);

/**
 * Ready-to-render ad slides: admin banners first, then auto-generated deal slides from the live
 * catalogue so the carousel always has at least 3 slides (when the catalogue allows).
 */
export function buildBannerSlides(banners, merch) {
  const slides = banners.map((b, i) => {
    const p = b.product;
    return {
      id: `b-${b.id}`,
      theme: THEMES.includes(b.theme) ? b.theme : THEMES[i % 5],
      label: p?.brand ? `${p.brand} · Limited deal` : "Limited time deal",
      badge: b.badge || (p?.off ? `${p.off}% OFF` : b.title),
      title: b.title,
      sub: b.subtitle || (p ? p.name : ""),
      href: b.ctaHref || (p ? `/watches/${p.slug}` : "/watches"),
      cta: b.ctaLabel || "Shop now",
      image: b.image || null,
      products: p ? [p] : [],
    };
  });
  if (slides.length >= 3 || !merch) return slides;

  const auto = [];
  const deals = (merch.deals || []).map(mini).filter((p) => p.image);
  if (deals.length && merch.maxDiscount > 0) {
    auto.push({
      id: "auto-deals",
      theme: "saffron",
      label: "Mega watch sale",
      badge: `UP TO ${merch.maxDiscount}% OFF`,
      title: "Luxury looks, everyday prices",
      sub: (() => {
        const names = [...new Set(deals.slice(0, 8).map((d) => d.brand).filter((b) => b && !/premiumshopy|premium shopy/i.test(b)))].slice(0, 3);
        return names.length ? `${names.join(", ")} & more` : "Top styles at their lowest prices";
      })(),
      href: "/watches?sale=1&sort=price-asc",
      cta: "Shop now",
      products: deals.slice(0, 3),
    });
  }
  const under = (merch.cheapest || []).filter((p) => p.price <= 999).map(mini).filter((p) => p.image);
  if (under.length) {
    const band = merch.priceBands?.find((b) => b.min == null && b.max === 999);
    auto.push({
      id: "auto-under",
      theme: "sun",
      label: "Budget picks",
      badge: "Under ₹999",
      title: `${band?.count || under.length}+ styles at one low price`,
      sub: "Analog, digital & sporty — all Cash on Delivery",
      href: "/watches?max=999",
      cta: "Shop now",
      products: under.slice(0, 3),
    });
  }
  const smart = (merch.smart || []).map(mini).filter((p) => p.image);
  if (smart.length) {
    const min = Math.min(...smart.map((p) => p.price));
    auto.push({
      id: "auto-smart",
      theme: "teal",
      label: "Smart watches",
      badge: `From ${fmt(min)}`,
      title: "Calls, fitness & notifications",
      sub: "Smart watches with big displays at small prices",
      href: "/category/smart-watches",
      cta: "Shop now",
      products: smart.slice(0, 3),
    });
  }
  const top = merch.topBrand;
  if (top?.minPrice) {
    const items = (top.products || []).map(mini).filter((p) => p.image);
    auto.push({
      id: `auto-brand-${top.slug}`,
      theme: "crimson",
      label: `${top.name} store`,
      badge: `From ${fmt(top.minPrice)}`,
      title: `${top.name} deals`,
      sub: `${top.count} styles to choose from`,
      href: `/brands/${top.slug}`,
      cta: "Shop now",
      products: items,
    });
  }
  return [...slides, ...auto.slice(0, Math.max(0, 5 - slides.length))];
}
