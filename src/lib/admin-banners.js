import "server-only";
import { db } from "./db";
import { HttpError } from "./admin-api";
import { discountPct } from "./utils";

export const BANNER_THEMES = ["saffron", "teal", "crimson", "sun", "forest", "ink"];

const productSelect = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  price: true,
  mrp: true,
  status: true,
  brand: { select: { name: true } },
  images: { take: 1, orderBy: { position: "asc" }, select: { url: true } },
};

/** Compact product card used by the banner editor (thumbnail, price, discount). */
export const bannerProduct = (p) =>
  p
    ? {
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        price: p.price,
        mrp: p.mrp,
        off: discountPct(p.price, p.mrp),
        status: p.status,
        brand: p.brand?.name || null,
        image: p.images?.[0]?.url || null,
      }
    : null;

/** Serialise banners for the client and attach their featured product (if any). */
export async function withBannerProducts(rows) {
  const list = [].concat(rows);
  const ids = [...new Set(list.map((b) => b.productId).filter(Boolean))];
  const products = ids.length ? await db.product.findMany({ where: { id: { in: ids } }, select: productSelect }) : [];
  const map = new Map(products.map((p) => [p.id, bannerProduct(p)]));
  const iso = (d) => (d ? new Date(d).toISOString() : null);
  return list.map((b) => ({
    ...b,
    createdAt: iso(b.createdAt),
    startsAt: iso(b.startsAt),
    endsAt: iso(b.endsAt),
    product: b.productId ? map.get(b.productId) || null : null,
  }));
}

/** Validate cross-field rules (schedule order, product exists) before a write. */
export async function assertBannerData(data, existing = null) {
  const startsAt = data.startsAt !== undefined ? data.startsAt : existing?.startsAt;
  const endsAt = data.endsAt !== undefined ? data.endsAt : existing?.endsAt;
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) throw new HttpError(400, "End time must be after the start time");
  if (data.productId) {
    const p = await db.product.findUnique({ where: { id: data.productId }, select: { id: true } });
    if (!p) throw new HttpError(400, "Featured product not found");
  }
}

/** Product facts for the banner copy AI. */
export async function getBannerProduct(id) {
  if (!id) return null;
  const p = await db.product.findUnique({ where: { id }, select: { ...productSelect, gender: true, dialColor: true, movement: true, strapMaterial: true } });
  if (!p) return null;
  return { ...bannerProduct(p), gender: p.gender, dialColor: p.dialColor, movement: p.movement, strapMaterial: p.strapMaterial };
}
