import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { orderInclude, timelineFromEvents, CANCELLABLE } from "@/lib/orders";
import { formatINR } from "@/lib/utils";
import { formatDateTime } from "@/components/commerce/format";
import OrderDetails from "@/components/commerce/OrderDetails";
import Timeline from "@/components/commerce/Timeline";
import StatusChip from "@/components/commerce/StatusChip";
import CancelOrderButton from "@/components/account/CancelOrderButton";

export async function generateMetadata({ params }) {
  const { orderNumber } = await params;
  return { title: `Order ${String(orderNumber).toUpperCase()}` };
}

export default async function AccountOrderDetail({ params }) {
  const { orderNumber } = await params;
  const user = await getCurrentUser();
  const order = await db.order.findFirst({
    where: { orderNumber: String(orderNumber).toUpperCase(), userId: user.id },
    include: orderInclude,
  });
  if (!order) notFound();
  const payLabel =
    order.paymentMethod === "COD"
      ? order.paymentStatus === "PAID"
        ? "Paid on delivery"
        : `Cash on Delivery · ${formatINR(order.total)} payable`
      : order.paymentStatus === "PAID"
        ? "Paid online"
        : "Online payment pending";

  return (
    <div>
      <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gold-2 hover:underline">
        <ArrowLeft className="size-4" strokeWidth={2} /> All orders
      </Link>
      <header className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-4 sm:px-5">
        <div>
          <p className="text-[12px] text-mute">Placed {formatDateTime(order.createdAt)}</p>
          <h1 className="mt-0.5 font-mono text-xl font-bold text-bone sm:text-2xl">{order.orderNumber}</h1>
          <p className="mt-1 text-[13px] text-bone-2">{payLabel}</p>
        </div>
        <StatusChip status={order.status} />
      </header>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
        <section aria-labelledby="tl-title" className="space-y-5 rounded-xl border border-line bg-white p-4 sm:p-5">
          <h2 id="tl-title" className="text-[16px] font-bold text-bone">
            Order status
          </h2>
          <Timeline status={order.status} events={timelineFromEvents(order.events)} />
          {order.trackingNumber && (
            <p className="text-[13px] text-bone-2">
              {order.courier || "Courier"} · AWB <span className="font-mono text-bone">{order.trackingNumber}</span>
            </p>
          )}
          {CANCELLABLE.includes(order.status) && <CancelOrderButton orderNumber={order.orderNumber} />}
          <p className="text-[13px] text-mute">
            Need help with this order?{" "}
            <Link href="/contact" className="font-semibold text-gold-2 hover:underline">
              Contact support
            </Link>
            .
          </p>
        </section>
        <OrderDetails order={order} />
      </div>
    </div>
  );
}
