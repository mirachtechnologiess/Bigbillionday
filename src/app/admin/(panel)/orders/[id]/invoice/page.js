import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-api";
import { getSettings } from "@/lib/settings";
import { formatINR, ORDER_STATUS_LABEL } from "@/lib/utils";
import PrintButton from "@/components/admin/orders/PrintButton";
import { rupeesInWords } from "@/components/admin/orders/amount-words";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice" };

const fmt = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

const PRINT_CSS = `
@page { size: A4; margin: 12mm; }
@media print {
  html, body { background: #fff !important; }
  body * { visibility: hidden !important; }
  #invoice-sheet, #invoice-sheet * { visibility: visible !important; }
  #invoice-sheet { position: absolute; left: 0; top: 0; width: 100%; margin: 0 !important; box-shadow: none !important; border: 0 !important; border-radius: 0 !important; padding: 0 !important; }
  #invoice-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

export default async function InvoicePage({ params, searchParams }) {
  await requireAdminPage();
  const { id } = await params;
  const sp = await searchParams;
  const slip = sp?.type === "slip";
  const [order, settings] = await Promise.all([db.order.findUnique({ where: { id }, include: { items: true } }), getSettings()]);
  if (!order) notFound();
  const store = settings.store;
  const cod = order.paymentMethod === "COD";
  const units = order.items.reduce((s, i) => s + i.quantity, 0);
  const shipTo = [order.line1, order.line2, order.landmark ? `Landmark: ${order.landmark}` : null, `${order.city}, ${order.state} - ${order.pincode}`].filter(Boolean);

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <Link href={`/admin/orders/${order.id}`} className="a-btn a-btn-ghost">
          <ChevronLeft /> Order #{order.orderNumber}
        </Link>
        <span className="flex-1" />
        <div className="inline-flex rounded-xl border border-line p-0.5">
          <Link href={`/admin/orders/${order.id}/invoice`} className={`a-btn a-btn-sm ${slip ? "a-btn-ghost !border-transparent" : ""}`}>Tax invoice</Link>
          <Link href={`/admin/orders/${order.id}/invoice?type=slip`} className={`a-btn a-btn-sm ${slip ? "" : "a-btn-ghost !border-transparent"}`}>Packing slip</Link>
        </div>
        <PrintButton label={slip ? "Print slip" : "Print invoice"} />
      </div>

      <article id="invoice-sheet" className="mx-auto max-w-[820px] rounded-lg bg-white p-6 text-[12.5px] leading-relaxed text-black shadow-2xl sm:p-10" style={{ colorScheme: "light" }}>
        <header className="flex flex-col gap-4 border-b-2 border-black pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="font-display text-[28px] leading-none tracking-tight">{store.name}</div>
            {store.address && <div className="mt-2 max-w-[320px] whitespace-pre-line text-neutral-700">{store.address}</div>}
            <div className="mt-1 text-neutral-700">
              {[store.phone && `Ph: ${store.phone}`, store.email].filter(Boolean).join(" · ")}
            </div>
            {store.gstin && <div className="mt-1 font-mono text-[11.5px]">GSTIN: {store.gstin}</div>}
          </div>
          <div className="sm:text-right">
            <div className="text-[18px] font-bold uppercase tracking-[0.18em]">{slip ? "Packing Slip" : "Tax Invoice"}</div>
            <table className="mt-2 sm:ml-auto">
              <tbody className="[&_td]:py-0.5 [&_td:first-child]:pr-3 [&_td:first-child]:text-neutral-500">
                <tr><td>{slip ? "Order no." : "Invoice no."}</td><td className="font-mono font-semibold">{order.orderNumber}</td></tr>
                <tr><td>Date</td><td>{fmt(order.createdAt)}</td></tr>
                <tr><td>Payment</td><td>{cod ? "Cash on Delivery" : "Prepaid (Online)"}</td></tr>
                {slip && <tr><td>Status</td><td>{ORDER_STATUS_LABEL[order.status]}</td></tr>}
                {order.courier && <tr><td>Courier</td><td>{order.courier}</td></tr>}
                {order.trackingNumber && <tr><td>AWB</td><td className="font-mono">{order.trackingNumber}</td></tr>}
              </tbody>
            </table>
          </div>
        </header>

        <section className="grid gap-5 border-b border-neutral-300 py-5 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{slip ? "Customer" : "Bill to"}</div>
            <div className="font-semibold">{order.shippingName}</div>
            <div>{order.email}</div>
            <div>{order.phone}</div>
          </div>
          <div>
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Ship to</div>
            <div className={slip ? "text-[15px] font-semibold" : "font-semibold"}>{order.shippingName}</div>
            {shipTo.map((l, i) => (
              <div key={i} className={slip ? "text-[14px]" : ""}>{l}</div>
            ))}
            <div className={slip ? "text-[14px] font-semibold" : ""}>Phone: {order.phone}</div>
          </div>
        </section>

        <table className="mt-5 w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black text-left text-[10.5px] uppercase tracking-[0.12em]">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Item</th>
              <th className="py-2 pr-2">SKU</th>
              <th className="py-2 pr-2 text-right">Qty</th>
              {!slip && <th className="py-2 pr-2 text-right">Rate</th>}
              {!slip && <th className="py-2 text-right">Amount</th>}
              {slip && <th className="py-2 text-center">Packed</th>}
            </tr>
          </thead>
          <tbody>
            {order.items.map((it, i) => (
              <tr key={it.id} className="border-b border-neutral-200 align-top">
                <td className="py-2 pr-2 text-neutral-500">{i + 1}</td>
                <td className="py-2 pr-2">
                  <div className="font-medium">{it.name}</div>
                  <div className="text-[11px] text-neutral-500">{it.brand}</div>
                </td>
                <td className="py-2 pr-2 font-mono text-[11.5px]">{it.sku}</td>
                <td className="py-2 pr-2 text-right font-mono">{it.quantity}</td>
                {!slip && <td className="py-2 pr-2 text-right font-mono">{formatINR(it.price)}</td>}
                {!slip && <td className="py-2 text-right font-mono">{formatINR(it.price * it.quantity)}</td>}
                {slip && <td className="py-2 text-center"><span className="inline-block h-4 w-4 border border-black" /></td>}
              </tr>
            ))}
          </tbody>
        </table>

        {!slip ? (
          <section className="mt-4 flex flex-col-reverse gap-5 sm:flex-row sm:justify-between">
            <div className="max-w-[380px]">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Amount in words</div>
              <div className="mt-1 font-medium">{rupeesInWords(order.total)}</div>
              <p className="mt-3 text-[11px] text-neutral-600">All prices are inclusive of applicable GST.</p>
              {cod && (
                <p className="mt-2 rounded border border-black px-2 py-1.5 text-[11.5px] font-semibold">
                  CASH ON DELIVERY — collect {formatINR(order.total)} {order.paymentStatus === "PAID" ? "(collected)" : "at delivery"}
                </p>
              )}
            </div>
            <table className="w-full font-mono text-[12.5px] sm:w-[280px]">
              <tbody className="[&_td]:py-0.5 [&_td:last-child]:text-right">
                <tr><td className="font-sans text-neutral-600">Subtotal</td><td>{formatINR(order.subtotal)}</td></tr>
                {order.discount > 0 && (
                  <tr><td className="font-sans text-neutral-600">Discount{order.couponCode ? ` (${order.couponCode})` : ""}</td><td>− {formatINR(order.discount)}</td></tr>
                )}
                <tr><td className="font-sans text-neutral-600">Shipping</td><td>{order.shippingFee ? formatINR(order.shippingFee) : "Free"}</td></tr>
                {order.codFee > 0 && <tr><td className="font-sans text-neutral-600">COD fee</td><td>{formatINR(order.codFee)}</td></tr>}
                <tr className="border-t-2 border-black text-[15px] font-bold"><td className="pt-1.5 font-sans">Total</td><td className="pt-1.5">{formatINR(order.total)}</td></tr>
              </tbody>
            </table>
          </section>
        ) : (
          <section className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Contents</div>
              <div className="mt-1">{order.items.length} line{order.items.length === 1 ? "" : "s"} · {units} unit{units === 1 ? "" : "s"}</div>
              {order.notes && <div className="mt-2 text-[11.5px]"><span className="font-semibold">Customer note:</span> {order.notes}</div>}
            </div>
            {cod && order.paymentStatus !== "PAID" && (
              <div className="self-start rounded border-2 border-black p-3 text-center">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em]">Cash on Delivery</div>
                <div className="mt-1 font-mono text-[22px] font-bold">{formatINR(order.total)}</div>
              </div>
            )}
          </section>
        )}

        <footer className="mt-10 flex items-end justify-between gap-4 border-t border-neutral-300 pt-4 text-[11px] text-neutral-600">
          <div>
            Thank you for shopping with {store.name}.
            {store.email && <> Questions? {store.email}</>}
            {store.whatsapp && <> · WhatsApp {store.whatsapp}</>}
          </div>
          {!slip && <div className="text-right">This is a computer-generated invoice<br />and does not require a signature.</div>}
        </footer>
      </article>
    </div>
  );
}
