import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-api";
import { allowedTransitions } from "@/lib/admin-orders";
import { getSettings } from "@/lib/settings";
import OrderDetail from "@/components/admin/orders/OrderDetail";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order" };

export default async function OrderPage({ params }) {
  await requireAdminPage();
  const { id } = await params;
  const [order, settings] = await Promise.all([
    db.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { id: true, slug: true, stock: true } } } },
        events: { orderBy: { createdAt: "desc" } },
        user: { select: { id: true, name: true, email: true, isBlocked: true, _count: { select: { orders: true } } } },
      },
    }),
    getSettings(),
  ]);
  if (!order) notFound();

  const data = {
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    events: order.events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
  };

  return <OrderDetail order={data} allowed={allowedTransitions(order.status)} storeName={settings.store.name} />;
}
