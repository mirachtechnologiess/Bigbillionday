import { adminRoute, csvResponse, toCsv } from "@/lib/admin-api";
import { db } from "@/lib/db";
import { IMPORT_KEYS } from "@/components/admin/import/fields";

export const runtime = "nodejs";

/** GET → CSV of every product, using the import template's headers (round-trips through /admin/import). */
export const GET = adminRoute(async (req) => {
  const status = new URL(req.url).searchParams.get("status");
  const products = await db.product.findMany({
    where: ["DRAFT", "ACTIVE", "ARCHIVED"].includes(status) ? { status } : {},
    orderBy: { createdAt: "asc" },
    include: {
      brand: { select: { name: true } },
      category: { select: { name: true } },
      images: { orderBy: { position: "asc" }, select: { url: true } },
    },
  });
  const yn = (b) => (b ? "yes" : "no");
  const rows = products.map((p) => ({
    name: p.name,
    brand: p.brand?.name || "",
    sku: p.sku,
    modelNumber: p.modelNumber,
    category: p.category?.name || "",
    gender: p.gender,
    status: p.status,
    price: p.price,
    mrp: p.mrp,
    costPrice: p.costPrice,
    stock: p.stock,
    lowStockAt: p.lowStockAt,
    codAvailable: yn(p.codAvailable),
    shortDescription: p.shortDescription,
    description: p.description,
    highlights: p.highlights,
    tags: p.tags,
    seoTitle: p.seoTitle,
    seoDesc: p.seoDesc,
    movement: p.movement,
    display: p.display,
    caseMaterial: p.caseMaterial,
    caseSize: p.caseSize,
    caseShape: p.caseShape,
    dialColor: p.dialColor,
    strapMaterial: p.strapMaterial,
    strapColor: p.strapColor,
    glass: p.glass,
    waterResistance: p.waterResistance,
    features: p.features,
    warranty: p.warranty,
    weightGrams: p.weightGrams,
    images: p.images.map((i) => i.url),
    isFeatured: yn(p.isFeatured),
    isNewArrival: yn(p.isNewArrival),
    isBestSeller: yn(p.isBestSeller),
  }));
  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(toCsv(rows, IMPORT_KEYS), `products-${stamp}.csv`);
});
