import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-api";
import CustomerDetail from "@/components/admin/customers/CustomerDetail";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customer" };

const EXCLUDED = ["CANCELLED", "RETURNED"];

export default async function CustomerPage({ params }) {
  const me = await requireAdminPage();
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, phone: true, role: true, isBlocked: true, createdAt: true,
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
      _count: { select: { orders: true, wishlist: true, reviews: true } },
    },
  });
  if (!user) notFound();

  const [orders, agg] = await Promise.all([
    db.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, orderNumber: true, createdAt: true, total: true, status: true, paymentMethod: true, paymentStatus: true, city: true,
        _count: { select: { items: true } },
      },
    }),
    db.order.aggregate({ where: { userId: id, status: { notIn: EXCLUDED } }, _sum: { total: true }, _count: { _all: true } }),
  ]);

  const spent = agg._sum.total || 0;
  const valid = agg._count._all;
  const data = {
    ...user,
    createdAt: user.createdAt.toISOString(),
    addresses: user.addresses.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
    orders: orders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString(), itemCount: o._count.items })),
    stats: {
      orders: user._count.orders,
      spent,
      aov: valid ? Math.round(spent / valid) : 0,
      lastOrderAt: orders[0]?.createdAt.toISOString() || null,
      wishlist: user._count.wishlist,
      reviews: user._count.reviews,
    },
  };

  return <CustomerDetail user={data} me={{ id: me.id, role: me.role }} />;
}
