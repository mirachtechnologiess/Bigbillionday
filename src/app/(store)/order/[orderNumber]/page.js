import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Banknote, CreditCard, PackageCheck, PhoneCall, Truck } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getSession } from "@/lib/auth";
import { getOrderForViewer, timelineFromEvents } from "@/lib/orders";
import { formatINR } from "@/lib/utils";
import { firstName, formatDate } from "@/components/commerce/format";
import OrderDetails from "@/components/commerce/OrderDetails";
import Timeline from "@/components/commerce/Timeline";
import StatusChip from "@/components/commerce/StatusChip";
import ConfirmationMark from "@/components/order/ConfirmationMark";
import Reveal from "@/components/order/Reveal";
import CopyButton from "@/components/order/CopyButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { orderNumber } = await params;
  return {
    title: `Order ${String(orderNumber).toUpperCase()}`,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function OrderPage({ params, searchParams }) {
  const [{ orderNumber }, sp] = await Promise.all([params, searchParams]);
  const order = await getOrderForViewer(orderNumber, typeof sp?.t === "string" ? sp.t : null);
  if (!order) notFound();
  const [settings, session] = await Promise.all([getSettings(), getSession()]);
  const { shipping, store } = settings;

  const isCod = order.paymentMethod === "COD";
  const paid = order.paymentStatus === "PAID";
  const cancelled = order.status === "CANCELLED";
  const fresh = Date.now() - new Date(order.createdAt).getTime() < 1000 * 60 * 60 * 24;

  const steps = [
    { icon: PhoneCall, t: "Quick confirmation", d: "Our team calls or WhatsApps you once to confirm the order and address." },
    { icon: PackageCheck, t: "Quality checked & packed", d: "Your watch is checked, securely packed and dispatched within 24–48 hours." },
    {
      icon: Truck,
      t: isCod ? "Pay on delivery" : "Delivered to your door",
      d: isCod
        ? `Delivered in ${shipping.etaDays} business days. Keep ${formatINR(order.total)} ready — cash or UPI.`
        : `Delivered in ${shipping.etaDays} business days.`,
    },
  ];

  return (
    <div className="bg-ink-2">
      <div className="container-lux pb-16 pt-5 sm:pt-8">
        <section className="mx-auto flex max-w-3xl flex-col items-center rounded-xl border border-line bg-white px-4 py-6 text-center sm:px-6 sm:py-8">
          {cancelled ? null : <ConfirmationMark />}
          <Reveal delay={cancelled ? 0 : 0.3} className="mt-4">
            <p className={cancelled ? "text-[13px] font-semibold text-ember" : "text-[13px] font-semibold text-lume"}>
              {cancelled ? "Order cancelled" : fresh ? "Order placed successfully" : "Your order"}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-bone sm:text-3xl">
              {cancelled ? "This order was cancelled" : `Thank you, ${firstName(order.shippingName)}!`}
            </h1>
            {!cancelled && (
              <p className="mx-auto mt-2 max-w-lg text-[14px] leading-relaxed text-bone-2">
                Your order is confirmed and our team is preparing it. Updates will be sent to{" "}
                <span className="font-semibold text-bone">+91 {order.phone}</span>.
              </p>
            )}
          </Reveal>
          <Reveal delay={cancelled ? 0.05 : 0.4} className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-line-2 bg-ink-2 py-1 pl-3 pr-1">
              <span className="text-[12px] text-mute">Order no.</span>
              <span className="font-mono text-[14px] font-bold text-bone">{order.orderNumber}</span>
              <CopyButton value={order.orderNumber} label="Copy order number" />
            </div>
            <StatusChip status={order.status} />
          </Reveal>
        </section>

        {/* Payment callout */}
        {!cancelled && (
          <Reveal delay={0.45} className="mx-auto mt-4 max-w-3xl">
            <div className="rounded-xl border border-gold/40 bg-gold-3 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  {isCod ? (
                    <Banknote className="mt-0.5 size-6 shrink-0 text-gold-2" strokeWidth={1.75} />
                  ) : (
                    <CreditCard className="mt-0.5 size-6 shrink-0 text-gold-2" strokeWidth={1.75} />
                  )}
                  <div>
                    <p className="text-[15px] font-bold text-bone">
                      {isCod ? "Amount payable on delivery" : paid ? "Paid online" : "Payment pending"}
                    </p>
                    <p className="mt-0.5 text-[13px] text-bone-2">
                      {isCod
                        ? "Pay the courier in cash or UPI when the parcel arrives. Please don't pay anyone in advance."
                        : paid
                          ? "We've received your payment. Nothing to pay on delivery."
                          : `We haven't received the payment yet. Please contact us${store.whatsapp ? " on WhatsApp" : ""} to complete it.`}
                    </p>
                  </div>
                </div>
                <p className="text-2xl font-bold leading-none text-bone tabular-nums sm:text-3xl">
                  {isCod || !paid ? formatINR(order.total) : formatINR(0)}
                </p>
              </div>
            </div>
          </Reveal>
        )}

        <div className="mx-auto mt-4 grid max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            {!cancelled && (
              <section aria-labelledby="next-title" className="rounded-xl border border-line bg-white p-4 sm:p-5">
                <h2 id="next-title" className="text-[16px] font-bold text-bone">
                  What happens next
                </h2>
                <ol className="mt-3 space-y-3">
                  {steps.map(({ icon: Icon, t, d }) => (
                    <li key={t} className="flex gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold-3 text-gold-2">
                        <Icon className="size-[18px]" strokeWidth={1.75} />
                      </span>
                      <div>
                        <p className="text-[14px] font-semibold text-bone">{t}</p>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-bone-2">{d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            <section aria-labelledby="status-title" className="rounded-xl border border-line bg-white p-4 sm:p-5">
              <div className="flex items-baseline justify-between">
                <h2 id="status-title" className="text-[16px] font-bold text-bone">
                  Order status
                </h2>
                <p className="text-[12px] text-mute">Placed {formatDate(order.createdAt)}</p>
              </div>
              <div className="mt-4">
                <Timeline status={order.status} events={timelineFromEvents(order.events)} />
              </div>
              {order.trackingNumber && (
                <p className="mt-4 text-[13px] text-bone-2">
                  {order.courier || "Courier"} · AWB <span className="font-mono text-bone">{order.trackingNumber}</span>
                </p>
              )}
            </section>
          </div>
          <OrderDetails order={order} />
        </div>

        <div className="mx-auto mt-6 flex max-w-3xl flex-col items-center gap-3 text-center">
          {!session && (
            <p className="max-w-md text-[13px] text-bone-2">
              Create an account with <span className="font-semibold text-bone">{order.email}</span> and the same mobile number, and
              this order will appear in your account automatically.
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/watches" className="btn btn-gold">
              Continue shopping <ArrowRight className="size-4" strokeWidth={2} />
            </Link>
            {session ? (
              <Link href="/account/orders" className="btn btn-ghost">
                My orders
              </Link>
            ) : (
              <Link href="/register?next=/account/orders" className="btn btn-ghost">
                Create account
              </Link>
            )}
            <Link href={`/track-order?orderNumber=${order.orderNumber}`} className="btn btn-ghost">
              Track order
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
