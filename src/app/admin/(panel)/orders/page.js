import { db } from "@/lib/db";
import { requireAdminPage, paging } from "@/lib/admin-api";
import { ORDER_STATUSES, orderWhere } from "@/lib/admin-orders";
import OrdersList from "@/components/admin/orders/OrdersList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }) {
  await requireAdminPage();
  const sp = await searchParams;
  const { page, per, skip, take } = paging(sp, 25);
  const where = orderWhere(sp);
  const baseWhere = orderWhere(sp, { withStatus: false });

  const [orders, total, grouped] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true, orderNumber: true, createdAt: true, shippingName: true, phone: true, email: true, city: true, state: true,
        total: true, status: true, paymentMethod: true, paymentStatus: true, riskScore: true, riskReason: true,
        _count: { select: { items: true } },
        items: { select: { quantity: true, image: true, name: true }, take: 3 },
      },
    }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], where: baseWhere, _count: { _all: true } }),
  ]);

  const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
  let all = 0;
  for (const g of grouped) {
    counts[g.status] = g._count._all;
    all += g._count._all;
  }

  const rows = orders.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
    itemCount: o._count.items,
    thumbs: o.items.map((i) => i.image).filter(Boolean),
    firstItem: o.items[0]?.name || "",
  }));

  return <OrdersList rows={rows} counts={{ ALL: all, ...counts }} page={page} pages={Math.max(1, Math.ceil(total / per))} total={total} />;
}
