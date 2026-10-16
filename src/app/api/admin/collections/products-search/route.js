import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-api";
import { discountPct } from "@/lib/utils";

/** GET ?q= → [{ id, name, sku, price, mrp, off, image, status }] for the collection product picker. */
export const GET = adminRoute(async (req) => {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") || "").trim().slice(0, 80);
  const ci = { contains: q, mode: "insensitive" };
  const rows = await db.product.findMany({
    where: q ? { OR: [{ name: ci }, { sku: ci }, { modelNumber: ci }, { brand: { name: ci } }] } : {},
    take: 24,
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, sku: true, price: true, mrp: true, status: true, brand: { select: { name: true } }, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } },
  });
  return ok({
    products: rows.map((p) => ({ id: p.id, name: p.name, sku: p.sku, price: p.price, mrp: p.mrp, off: discountPct(p.price, p.mrp), status: p.status, brand: p.brand?.name || null, image: p.images[0]?.url || null })),
  });
});
