import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-api";

export const GET = adminRoute(async (req) => {
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 80);
  if (q.length < 2) return ok({ products: [], orders: [], customers: [] });
  const ci = { contains: q, mode: "insensitive" };
  const digits = q.replace(/\D/g, "");
  const [products, orders, customers] = await Promise.all([
    db.product.findMany({
      where: { OR: [{ name: ci }, { sku: ci }, { modelNumber: ci }, { brand: { name: ci } }] },
      take: 6,
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, sku: true, price: true, stock: true, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } },
    }),
    db.order.findMany({
      where: {
        OR: [
          { orderNumber: { contains: q.replace(/^#/, ""), mode: "insensitive" } },
          { shippingName: ci },
          { email: ci },
          ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
        ],
      },
      take: 6,
      orderBy: { createdAt: "desc" },
      select: { id: true, orderNumber: true, shippingName: true, total: true, status: true },
    }),
    db.user.findMany({
      where: { OR: [{ name: ci }, { email: ci }, ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : [])] },
      take: 5,
      select: { id: true, name: true, email: true, phone: true },
    }),
  ]);
  return ok({ products: products.map((p) => ({ ...p, image: p.images[0]?.url || null, images: undefined })), orders, customers });
});
