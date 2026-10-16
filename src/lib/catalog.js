import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";

// Hot storefront queries are cached in the Next data cache (shared per pod) and
// invalidated by revalidateTag("catalog") whenever admin changes products.
const cached = (fn, key, revalidate = 120) => unstable_cache(fn, [key], { tags: ["catalog"], revalidate });
import { db } from "./db";

/** Fields every product card needs. */
export const cardSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  mrp: true,
  stock: true,
  gender: true,
  isNewArrival: true,
  isBestSeller: true,
  ratingAvg: true,
  ratingCount: true,
  movement: true,
  caseSize: true,
  brand: { select: { name: true, slug: true } },
  images: { select: { url: true, alt: true, blurData: true }, orderBy: { position: "asc" }, take: 2 },
};

export const SORTS = {
  featured: [{ isFeatured: "desc" }, { soldCount: "desc" }, { createdAt: "desc" }],
  newest: [{ createdAt: "desc" }],
  "price-asc": [{ price: "asc" }],
  "price-desc": [{ price: "desc" }],
  popular: [{ soldCount: "desc" }, { viewCount: "desc" }],
  rating: [{ ratingAvg: "desc" }, { ratingCount: "desc" }],
};

const list = (v) => (v ? String(v).split(",").filter(Boolean) : []);

/**
 * Build a Prisma where-clause from URL search params.
 * Supported: q, brand, category, collection, gender, movement, display, caseMaterial, strapMaterial,
 * dialColor, glass, waterResistance, min, max, size (e.g. "38-42"), inStock, sale, new
 */
export function buildWhere(sp = {}) {
  const where = { status: "ACTIVE" };
  const and = [];
  if (sp.q) {
    const q = String(sp.q).trim();
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { modelNumber: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
        { tags: { has: q.toLowerCase() } },
      ],
    });
  }
  const brands = list(sp.brand);
  if (brands.length) where.brand = { slug: { in: brands } };
  const cats = list(sp.category);
  if (cats.length) where.category = { slug: { in: cats } };
  if (sp.collection) where.collections = { some: { collection: { slug: sp.collection } } };
  const genders = list(sp.gender).map((g) => g.toUpperCase());
  if (genders.length) where.gender = { in: genders };
  for (const f of ["movement", "display", "caseMaterial", "strapMaterial", "dialColor", "glass", "waterResistance", "caseShape"]) {
    const vals = list(sp[f]);
    if (vals.length) where[f] = { in: vals };
  }
  if (sp.min || sp.max) where.price = { ...(sp.min && { gte: Number(sp.min) }), ...(sp.max && { lte: Number(sp.max) }) };
  if (sp.size) {
    const [a, b] = String(sp.size).split("-").map(Number);
    where.caseSize = { ...(a && { gte: a }), ...(b && { lte: b }) };
  }
  if (sp.inStock === "1") where.stock = { gt: 0 };
  if (sp.new === "1") where.isNewArrival = true;
  if (sp.sale === "1") and.push({ mrp: { gt: db.product.fields.price } });
  if (and.length) where.AND = and;
  return where;
}

export const searchProducts = (sp = {}, opts = {}) => cachedSearch(JSON.stringify(sp), opts.perPage ?? 24);
const cachedSearch = cached((spJson, perPage) => searchProductsUncached(JSON.parse(spJson), { perPage }), "search");

async function searchProductsUncached(sp = {}, { perPage = 24 } = {}) {
  const page = Math.max(1, Number(sp.page) || 1);
  const where = buildWhere(sp);
  const orderBy = SORTS[sp.sort] || SORTS.featured;
  const [items, total] = await Promise.all([
    db.product.findMany({ where, orderBy, select: cardSelect, skip: (page - 1) * perPage, take: perPage }),
    db.product.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

/** Facet values with counts for the filter sidebar (scoped to ACTIVE products). */
export const getFacets = cache(cached(async () => {
  const base = { status: "ACTIVE" };
  const group = (by) =>
    db.product.groupBy({ by: [by], where: { ...base, [by]: { not: null } }, _count: { _all: true }, orderBy: { [by]: "asc" } });
  const [brands, categories, movement, display, caseMaterial, strapMaterial, dialColor, glass, waterResistance, gender, range] =
    await Promise.all([
      db.brand.findMany({
        where: { products: { some: base } },
        select: { name: true, slug: true, _count: { select: { products: { where: base } } } },
        orderBy: { name: "asc" },
      }),
      db.category.findMany({
        where: { products: { some: base } },
        select: { name: true, slug: true, _count: { select: { products: { where: base } } } },
        orderBy: { sortOrder: "asc" },
      }),
      group("movement"),
      group("display"),
      group("caseMaterial"),
      group("strapMaterial"),
      group("dialColor"),
      group("glass"),
      group("waterResistance"),
      db.product.groupBy({ by: ["gender"], where: base, _count: { _all: true } }),
      db.product.aggregate({ where: base, _min: { price: true }, _max: { price: true } }),
    ]);
  const flat = (rows, key) => rows.map((r) => ({ value: r[key], label: r[key], count: r._count._all }));
  return {
    brand: brands.map((b) => ({ value: b.slug, label: b.name, count: b._count.products })),
    category: categories.map((c) => ({ value: c.slug, label: c.name, count: c._count.products })),
    gender: gender.map((g) => ({ value: g.gender.toLowerCase(), label: g.gender[0] + g.gender.slice(1).toLowerCase(), count: g._count._all })),
    movement: flat(movement, "movement"),
    display: flat(display, "display"),
    caseMaterial: flat(caseMaterial, "caseMaterial"),
    strapMaterial: flat(strapMaterial, "strapMaterial"),
    dialColor: flat(dialColor, "dialColor"),
    glass: flat(glass, "glass"),
    waterResistance: flat(waterResistance, "waterResistance"),
    price: { min: range._min.price ?? 0, max: range._max.price ?? 0 },
  };
}, "facets", 300));

export const getProductBySlug = cache(async (slug) =>
  db.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      brand: true,
      category: true,
      images: { orderBy: { position: "asc" } },
      reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  })
);

export async function getRelated(product, take = 8) {
  return db.product.findMany({
    where: {
      status: "ACTIVE",
      id: { not: product.id },
      OR: [{ brandId: product.brandId }, { categoryId: product.categoryId ?? undefined }, { gender: product.gender }],
    },
    orderBy: [{ soldCount: "desc" }],
    select: cardSelect,
    take,
  });
}

export const getHomeData = cache(cached(async () => {
  const active = { status: "ACTIVE" };
  const [featured, newArrivals, bestSellers, brands, categories, collections, heroProducts] = await Promise.all([
    db.product.findMany({ where: { ...active, isFeatured: true }, select: cardSelect, take: 8, orderBy: { updatedAt: "desc" } }),
    db.product.findMany({ where: active, select: cardSelect, take: 10, orderBy: { createdAt: "desc" } }),
    db.product.findMany({ where: active, select: cardSelect, take: 8, orderBy: [{ isBestSeller: "desc" }, { soldCount: "desc" }] }),
    db.brand.findMany({ where: { products: { some: active } }, orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }], take: 24 }),
    db.category.findMany({ where: { parentId: null }, orderBy: { sortOrder: "asc" }, take: 8 }),
    db.collection.findMany({ where: { isActive: true, showOnHome: true }, orderBy: { sortOrder: "asc" }, take: 6 }),
    db.product.findMany({ where: { ...active, isFeatured: true }, select: cardSelect, take: 4, orderBy: { price: "desc" } }),
  ]);
  return { featured, newArrivals, bestSellers, brands, categories, collections, heroProducts };
}, "home"));
