import "server-only";
import { db } from "./db";

export const PRODUCT_SORTS = {
  updated: [{ updatedAt: "desc" }],
  newest: [{ createdAt: "desc" }],
  "name-asc": [{ name: "asc" }],
  "price-asc": [{ price: "asc" }],
  "price-desc": [{ price: "desc" }],
  "stock-asc": [{ stock: "asc" }],
  "stock-desc": [{ stock: "desc" }],
  bestselling: [{ soldCount: "desc" }],
  views: [{ viewCount: "desc" }],
};

/** Where-clause for the admin product list from URLSearchParams or a plain object. */
export function productWhere(sp) {
  const get = (k) => String((typeof sp.get === "function" ? sp.get(k) : sp[k]) || "");
  const where = {};
  const and = [];
  const q = get("q").trim();
  if (q) {
    const ci = { contains: q, mode: "insensitive" };
    and.push({ OR: [{ name: ci }, { sku: ci }, { modelNumber: ci }, { brand: { name: ci } }, { tags: { has: q.toLowerCase() } }] });
  }
  const status = get("status");
  if (["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)) where.status = status;
  if (get("brand")) where.brandId = get("brand");
  if (get("category")) where.categoryId = get("category");
  const stock = get("stock");
  if (stock === "out") where.stock = { lte: 0 };
  else if (stock === "low") and.push({ stock: { gt: 0 } }, { stock: { lte: db.product.fields.lowStockAt } });
  else if (stock === "in") where.stock = { gt: 0 };
  const flag = get("flag");
  if (flag === "featured") where.isFeatured = true;
  if (flag === "ai") where.aiGenerated = true;
  if (flag === "noimage") where.images = { none: {} };
  if (flag === "noseo") and.push({ OR: [{ seoTitle: null }, { seoDesc: null }] });
  if (and.length) where.AND = and;
  return where;
}

export const productListSelect = {
  id: true, name: true, slug: true, sku: true, price: true, mrp: true, costPrice: true, stock: true, lowStockAt: true,
  status: true, isFeatured: true, isNewArrival: true, isBestSeller: true, aiGenerated: true, soldCount: true, viewCount: true,
  seoTitle: true, seoDesc: true, updatedAt: true,
  brand: { select: { id: true, name: true } },
  images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
};

export async function listProducts(sp, { per = 25 } = {}) {
  const get = (k) => (typeof sp.get === "function" ? sp.get(k) : sp[k]);
  const page = Math.max(1, parseInt(get("page") || "1", 10) || 1);
  const take = Math.min(100, Math.max(5, parseInt(get("per") || String(per), 10) || per));
  const where = productWhere(sp);
  const [items, total] = await Promise.all([
    db.product.findMany({ where, orderBy: PRODUCT_SORTS[get("sort")] || PRODUCT_SORTS.updated, skip: (page - 1) * take, take, select: productListSelect }),
    db.product.count({ where }),
  ]);
  return {
    items: items.map((p) => ({ ...p, image: p.images[0]?.url || null, images: undefined, updatedAt: p.updatedAt.toISOString() })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / take)),
  };
}
