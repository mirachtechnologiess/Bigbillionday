import { db } from "@/lib/db";
import { handle, ok, rateLimit, clientIp } from "@/lib/api";
import { buildWhere } from "@/lib/catalog";

const CACHE = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

/** GET /api/search/suggest?q= → { products: [{id,name,slug,brand,price,mrp,image,blurData}], brands: [{name,slug}] } */
export const GET = handle(async (req) => {
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 60);
  if (q.length < 2) return ok({ products: [], brands: [] }, { headers: CACHE });
  rateLimit(`suggest:${clientIp(req)}`, 90, 60_000);

  const [products, brands] = await Promise.all([
    db.product.findMany({
      where: buildWhere({ q }),
      orderBy: [{ soldCount: "desc" }, { viewCount: "desc" }],
      take: 6,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        mrp: true,
        brand: { select: { name: true } },
        images: { select: { url: true, blurData: true }, orderBy: { position: "asc" }, take: 1 },
      },
    }),
    db.brand.findMany({
      where: { name: { contains: q, mode: "insensitive" }, products: { some: { status: "ACTIVE" } } },
      select: { name: true, slug: true },
      orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
      take: 4,
    }),
  ]);

  return ok(
    {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand?.name || "",
        price: p.price,
        mrp: p.mrp,
        image: p.images[0]?.url || null,
        blurData: p.images[0]?.blurData || null,
      })),
      brands,
    },
    { headers: CACHE }
  );
});
