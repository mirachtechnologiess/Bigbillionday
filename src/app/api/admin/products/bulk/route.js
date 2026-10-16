import { z } from "zod";
import { db } from "@/lib/db";
import { ok, HttpError, rateLimit } from "@/lib/api";
import { adminRoute, readJson, revalidateCatalog } from "@/lib/admin-api";
import { aiEnabled } from "@/lib/ai";
import { aiSeo } from "@/lib/admin-ai";

const schema = z.object({
  ids: z.array(z.string()).min(1).max(500),
  action: z.enum(["publish", "draft", "archive", "delete", "feature", "unfeature", "new", "unnew", "bestseller", "unbestseller", "price", "seo"]),
  value: z.coerce.number().optional(), // percentage for price, e.g. -10 or 15
  round: z.enum(["none", "9", "99", "10"]).optional().default("none"),
});

const STATUS = { publish: "ACTIVE", draft: "DRAFT", archive: "ARCHIVED" };
const FLAGS = {
  feature: { isFeatured: true }, unfeature: { isFeatured: false },
  new: { isNewArrival: true }, unnew: { isNewArrival: false },
  bestseller: { isBestSeller: true }, unbestseller: { isBestSeller: false },
};

function roundPrice(n, mode) {
  n = Math.max(1, Math.round(n));
  if (mode === "9") return Math.max(9, Math.round(n / 10) * 10 - 1);
  if (mode === "99") return Math.max(99, Math.round(n / 100) * 100 - 1);
  if (mode === "10") return Math.max(10, Math.round(n / 10) * 10);
  return n;
}

export const POST = adminRoute(async (req, { user }) => {
  const { ids, action, value, round } = await readJson(req, schema);
  const rows = await db.product.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } });
  const slugs = rows.map((r) => r.slug);
  const where = { id: { in: rows.map((r) => r.id) } };

  if (STATUS[action]) {
    if (action === "publish") {
      // refuse to publish products with no images / zero price
      const bad = await db.product.findMany({ where: { ...where, OR: [{ images: { none: {} } }, { price: { lt: 1 } }] }, select: { id: true, name: true } });
      const okIds = rows.map((r) => r.id).filter((id) => !bad.find((b) => b.id === id));
      const r = await db.product.updateMany({ where: { id: { in: okIds } }, data: { status: "ACTIVE" } });
      revalidateCatalog(slugs);
      return ok({ count: r.count, skipped: bad.map((b) => b.name), message: bad.length ? `${bad.length} skipped (no image)` : undefined });
    }
    const r = await db.product.updateMany({ where, data: { status: STATUS[action] } });
    revalidateCatalog(slugs);
    return ok({ count: r.count });
  }

  if (FLAGS[action]) {
    const r = await db.product.updateMany({ where, data: FLAGS[action] });
    revalidateCatalog(slugs);
    return ok({ count: r.count });
  }

  if (action === "delete") {
    if (user.role !== "ADMIN") throw new HttpError(403, "Only an ADMIN can delete products");
    const withOrders = await db.product.findMany({ where: { ...where, orderItems: { some: {} } }, select: { id: true } });
    const keep = new Set(withOrders.map((p) => p.id));
    const delIds = rows.map((r) => r.id).filter((id) => !keep.has(id));
    if (keep.size) await db.product.updateMany({ where: { id: { in: [...keep] } }, data: { status: "ARCHIVED" } });
    const r = await db.product.deleteMany({ where: { id: { in: delIds } } });
    revalidateCatalog(slugs);
    return ok({ count: r.count, archived: keep.size, message: keep.size ? `${keep.size} with orders were archived instead` : undefined });
  }

  if (action === "price") {
    if (!Number.isFinite(value) || value === 0 || value < -90 || value > 300) throw new HttpError(422, "Percentage must be between -90 and 300");
    const items = await db.product.findMany({ where, select: { id: true, price: true, mrp: true } });
    await db.$transaction(
      items.map((p) => {
        const price = roundPrice(p.price * (1 + value / 100), round);
        return db.product.update({ where: { id: p.id }, data: { price, mrp: Math.max(p.mrp, price) } });
      })
    );
    revalidateCatalog(slugs);
    return ok({ count: items.length });
  }

  if (action === "seo") {
    if (!aiEnabled()) throw new HttpError(503, "AI is not configured — set NVIDIA_API_KEY");
    if (ids.length > 10) throw new HttpError(422, "Send at most 10 products per AI SEO request");
    rateLimit(`ai:${user.id}`, 30, 60_000);
    const products = await db.product.findMany({ where, include: { brand: { select: { name: true } } } });
    const results = [];
    for (const p of products) {
      try {
        const seo = await aiSeo(p);
        await db.product.update({
          where: { id: p.id },
          data: { seoTitle: seo.seoTitle || p.seoTitle, seoDesc: seo.seoDesc || p.seoDesc, shortDescription: p.shortDescription || seo.shortDescription || null },
        });
        results.push({ id: p.id, ok: true, ...seo });
      } catch (e) {
        results.push({ id: p.id, ok: false, error: e.message });
      }
    }
    revalidateCatalog(slugs);
    return ok({ count: results.filter((r) => r.ok).length, results });
  }

  throw new HttpError(400, "Unknown action");
});
