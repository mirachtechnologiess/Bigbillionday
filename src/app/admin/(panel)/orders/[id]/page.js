import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-api";
import { allowedTransitions } from "@/lib/admin-orders";
import { getSettings } from "@/lib/settings";
import OrderDetail from "@/components/admin/orders/OrderDetail";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order" };

const HISTORY_LIMIT = 50;

/**
 * The same customer's other orders, newest first. Guests have no account, so orders are matched by
 * account, phone (last 10 digits, ignoring +91/spaces) or email.
 */
async function customerHistory(order) {
  const last10 = String(order.phone || "").replace(/\D/g, "").slice(-10);
  const match = [
    order.userId && { userId: order.userId },
    last10.length === 10 && { phone: { endsWith: last10 } },
    order.email && { email: { equals: order.email, mode: "insensitive" } },
  ].filter(Boolean);
  if (!match.length) return { orders: [], total: 0 };
  const where = { id: { not: order.id }, OR: match };
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
      select: {
        id: true, orderNumber: true, createdAt: true, status: true, total: true, paymentMethod: true, paymentStatus: true,
        items: { select: { name: true, image: true, quantity: true } },
      },
    }),
    db.order.groupBy({ by: ["status"], where, _count: true }),
  ]);
  return {
    orders: orders.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() })),
    byStatus: Object.fromEntries(total.map((s) => [s.status, s._count])),
    total: total.reduce((n, s) => n + s._count, 0),
  };
}

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
  const history = await customerHistory(order);

  const data = {
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    events: order.events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
  };

  return <OrderDetail order={data} history={history} allowed={allowedTransitions(order.status)} storeName={settings.store.name} />;
}
