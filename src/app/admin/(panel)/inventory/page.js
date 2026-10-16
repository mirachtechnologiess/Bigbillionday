import { db } from "@/lib/db";
import { requireAdminPage, paging } from "@/lib/admin-api";
import InventoryTable from "@/components/admin/inventory/InventoryTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inventory" };

const DAYS = 30;

export default async function InventoryPage({ searchParams }) {
  await requireAdminPage();
  const sp = await searchParams;
  const tab = ["out", "low", "all"].includes(sp.tab) ? sp.tab : "low";
  const { page, per, skip, take } = paging(sp, 50);
  const q = String(sp.q || "").trim();

  const base = { status: "ACTIVE" };
  const tabWhere = {
    out: { stock: { lte: 0 } },
    low: { stock: { gt: 0, lte: db.product.fields.lowStockAt } },
    all: {},
  };
  const search = q
    ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }, { brand: { name: { contains: q, mode: "insensitive" } } }] }
    : {};
  const where = { ...base, ...tabWhere[tab], ...search };

  const [products, total, outCount, lowCount, allCount] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: [{ stock: "asc" }, { soldCount: "desc" }],
      skip,
      take,
      select: {
        id: true, name: true, slug: true, sku: true, stock: true, lowStockAt: true, price: true,
        brand: { select: { name: true } },
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
      },
    }),
    db.product.count({ where }),
    db.product.count({ where: { ...base, ...tabWhere.out } }),
    db.product.count({ where: { ...base, ...tabWhere.low } }),
    db.product.count({ where: base }),
  ]);

  const since = new Date(Date.now() - DAYS * 86400000);
  const sold = products.length
    ? await db.orderItem.groupBy({
        by: ["productId"],
        where: { productId: { in: products.map((p) => p.id) }, order: { createdAt: { gte: since }, status: { notIn: ["CANCELLED", "RETURNED"] } } },
        _sum: { quantity: true },
      })
    : [];
  const soldMap = new Map(sold.map((s) => [s.productId, s._sum.quantity || 0]));

  const rows = products.map((p) => {
    const sold30 = soldMap.get(p.id) || 0;
    const velocity = sold30 / DAYS;
    const cover = velocity > 0 ? p.stock / velocity : null;
    const suggested = Math.max(0, Math.ceil(velocity * 30 + p.lowStockAt - p.stock));
    return {
      id: p.id, name: p.name, slug: p.slug, sku: p.sku, stock: p.stock, lowStockAt: p.lowStockAt, price: p.price,
      brand: p.brand?.name || "", image: p.images[0]?.url || null,
      sold30, velocity, cover, suggested,
    };
  });

  return (
    <InventoryTable
      tab={tab}
      rows={rows}
      counts={{ out: outCount, low: lowCount, all: allCount }}
      page={page}
      pages={Math.max(1, Math.ceil(total / per))}
      total={total}
    />
  );
}
