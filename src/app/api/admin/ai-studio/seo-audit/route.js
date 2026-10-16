import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-api";
import { db } from "@/lib/db";
import { AUDIT_SELECT, auditProduct } from "./audit";

export const runtime = "nodejs";

/** GET → { items: [{id,name,slug,status,brand,image,issues,seoTitle,seoDesc}], scanned } */
export const GET = adminRoute(async () => {
  const products = await db.product.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 2000,
    select: AUDIT_SELECT,
  });
  const items = [];
  for (const p of products) {
    const issues = auditProduct(p);
    if (!issues.length) continue;
    items.push({
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      brand: p.brand?.name || "",
      image: p.images[0]?.url || null,
      seoTitle: p.seoTitle || "",
      seoDesc: p.seoDesc || "",
      issues,
    });
  }
  return ok({ items, scanned: products.length });
});
