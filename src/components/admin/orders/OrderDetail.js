"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban, Check, ChevronRight, CircleDollarSign, ClipboardList, CreditCard, ExternalLink, FileText, MapPin, MessageCircle, MessageSquarePlus,
  Package, PackageOpen, RotateCcw, ShieldAlert, Truck, Undo2, User,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatINR, ORDER_FLOW, ORDER_STATUS_LABEL, storeUrl } from "@/lib/utils";
import { api } from "../fetcher";
import { Card, CopyButton, Field, Modal, OrderStatusPill, PageHeader, PAYMENT_TONE, Pill, RiskPill, Spinner, fmtDate, timeAgo } from "../ui";

const ACTION_META = {
  CANCELLED: { label: "Cancel order", icon: Ban, cls: "a-btn-danger" },
  RETURN_REQUESTED: { label: "Return requested", icon: Undo2, cls: "a-btn-ghost" },
  RETURNED: { label: "Mark returned", icon: RotateCcw, cls: "a-btn-ghost" },
  DELIVERED: { label: "Decline return (delivered)", icon: Check, cls: "a-btn-ghost" },
};

const waPhone = (p) => {
  const d = String(p || "").replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `91${d}` : null;
};

function addressLines(o) {
  return [o.shippingName, o.line1, o.line2, o.landmark ? `Landmark: ${o.landmark}` : null, `${o.city}, ${o.state} - ${o.pincode}`, `Phone: ${o.phone}`].filter(Boolean);
}

function waMessage(o, storeName, kind) {
  const first = o.shippingName.split(" ")[0];
  if (kind === "shipped") {
    return [
      `Hi ${first}, good news! Your ${storeName} order #${o.orderNumber} has been shipped.`,
      o.courier ? `Courier: ${o.courier}` : null,
      o.trackingNumber ? `Tracking number: ${o.trackingNumber}` : null,
      o.paymentMethod === "COD" ? `Please keep ${formatINR(o.total)} ready (Cash on Delivery).` : null,
      `Thank you for shopping with us!`,
    ].filter(Boolean).join("\n");
  }
  const items = o.items.map((i) => `• ${i.name} × ${i.quantity} — ${formatINR(i.price * i.quantity)}`).join("\n");
  return [
    `Hi ${first}, thank you for your order with ${storeName}!`,
    ``,
    `Order #${o.orderNumber}`,
    items,
    `Total: ${formatINR(o.total)} (${o.paymentMethod === "COD" ? "Cash on Delivery" : "Prepaid"})`,
    ``,
    `Delivery address:`,
    [o.line1, o.line2, o.landmark, `${o.city}, ${o.state} - ${o.pincode}`].filter(Boolean).join(", "),
    ``,
    `Reply YES to confirm your order.`,
  ].join("\n");
}

export default function OrderDetail({ order: o, allowed, storeName }) {
  const router = useRouter();
  const [target, setTarget] = useState(null); // status being moved to
  const [note, setNote] = useState("");
  const [courier, setCourier] = useState(o.courier || "");
  const [tracking, setTracking] = useState(o.trackingNumber || "");
  const [busy, setBusy] = useState(false);
  const [internal, setInternal] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [shipEdit, setShipEdit] = useState(false);

  const flowIdx = ORDER_FLOW.indexOf(o.status);
  const offFlow = flowIdx === -1;
  const lastFlowIdx = offFlow ? Math.max(...o.events.map((e) => ORDER_FLOW.indexOf(e.status)), 0) : flowIdx;
  const nextFlow = !offFlow && flowIdx < ORDER_FLOW.length - 1 ? ORDER_FLOW[flowIdx + 1] : null;
  const canNext = nextFlow && allowed.includes(nextFlow);
  const forwardOptions = allowed.filter((s) => ORDER_FLOW.includes(s) && s !== nextFlow && ORDER_FLOW.indexOf(s) > flowIdx);
  const sideActions = allowed.filter((s) => ACTION_META[s] && !(s === "DELIVERED" && o.status !== "RETURN_REQUESTED"));

  const wa = waPhone(o.phone);
  const shippedish = ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(o.status);
  const itemCount = o.items.reduce((s, i) => s + i.quantity, 0);

  async function patch(body, success) {
    const r = await api(`/api/admin/orders/${o.id}`, { method: "PATCH", body });
    toast.success(success);
    router.refresh();
    return r;
  }

  async function submitStatus() {
    if (target === "SHIPPED" && (!courier.trim() || !tracking.trim())) return toast.error("Courier and tracking number are required");
    setBusy(true);
    try {
      const body = { status: target, note: note.trim() || undefined };
      if (target === "SHIPPED") Object.assign(body, { courier: courier.trim(), trackingNumber: tracking.trim() });
      await patch(body, `Moved to ${ORDER_STATUS_LABEL[target]}`);
      setTarget(null);
      setNote("");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function payment(ps) {
    try {
      await patch({ paymentStatus: ps }, `Payment marked ${ps.toLowerCase()}`);
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function addNote(e) {
    e.preventDefault();
    if (!internal.trim()) return;
    setNoteBusy(true);
    try {
      await patch({ note: internal.trim() }, "Note added");
      setInternal("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setNoteBusy(false);
    }
  }

  async function saveShipping() {
    try {
      await patch({ courier: courier.trim(), trackingNumber: tracking.trim() }, "Shipping details saved");
      setShipEdit(false);
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div>
      <PageHeader
        back="/admin/orders"
        eyebrow={`Order · ${fmtDate(o.createdAt, true)}`}
        title={<span className="a-num">#{o.orderNumber}</span>}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <OrderStatusPill status={o.status} />
            <Pill tone={PAYMENT_TONE[o.paymentStatus]} dot={false}>{o.paymentMethod === "COD" ? "Cash on delivery" : "Prepaid"} · {o.paymentStatus.toLowerCase()}</Pill>
            <span>{itemCount} item{itemCount === 1 ? "" : "s"} · {formatINR(o.total)}</span>
          </span>
        }
        actions={
          <>
            {wa && (
              <a className="a-btn a-btn-ghost" target="_blank" rel="noreferrer" href={`https://wa.me/${wa}?text=${encodeURIComponent(waMessage(o, storeName, "confirm"))}`}>
                <MessageCircle /> {o.paymentMethod === "COD" ? "Verify COD" : "Confirm"}
              </a>
            )}
            {wa && shippedish && o.trackingNumber && (
              <a className="a-btn a-btn-ghost" target="_blank" rel="noreferrer" href={`https://wa.me/${wa}?text=${encodeURIComponent(waMessage(o, storeName, "shipped"))}`}>
                <Truck /> Shipped msg
              </a>
            )}
            <Link className="a-btn a-btn-ghost" href={`/admin/orders/${o.id}/invoice?type=slip`}>
              <ClipboardList /> Packing slip
            </Link>
            <Link className="a-btn" href={`/admin/orders/${o.id}/invoice`}>
              <FileText /> Invoice
            </Link>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Status stepper */}
          <Card title="Fulfilment" icon={Package}>
            <ol className="flex items-start overflow-x-auto pb-1">
              {ORDER_FLOW.map((s, i) => {
                const done = offFlow ? i <= lastFlowIdx : i <= flowIdx;
                const current = !offFlow && i === flowIdx;
                return (
                  <li key={s} className="flex min-w-[78px] flex-1 flex-col items-center text-center">
                    <div className="flex w-full items-center">
                      <span className={cn("h-px flex-1", i === 0 ? "opacity-0" : done ? "bg-gold" : "bg-line-2")} />
                      <span
                        className={cn(
                          "grid h-7 w-7 flex-none place-items-center rounded-full border text-[11px]",
                          current ? "border-gold bg-gold text-white shadow-[0_0_0_4px_rgb(242_96_12/0.15)]" : done ? "border-gold/60 bg-gold/15 text-gold-2" : "border-line-2 bg-ink-3 text-mute"
                        )}
                      >
                        {done && !current ? <Check className="h-3.5 w-3.5" /> : <span className="a-num">{i + 1}</span>}
                      </span>
                      <span className={cn("h-px flex-1", i === ORDER_FLOW.length - 1 ? "opacity-0" : i < (offFlow ? lastFlowIdx : flowIdx) ? "bg-gold" : "bg-line-2")} />
                    </div>
                    <span className={cn("mt-1.5 text-[11px] leading-tight", current ? "text-bone" : done ? "text-bone-2" : "text-mute")}>{ORDER_STATUS_LABEL[s]}</span>
                  </li>
                );
              })}
            </ol>

            {offFlow && (
              <div className={cn("mt-4 rounded-xl border px-3 py-2 text-[12.5px]", o.status === "CANCELLED" ? "border-danger/40 bg-danger/5 text-danger" : "border-ember/40 bg-ember/5 text-ember")}>
                This order is <strong>{ORDER_STATUS_LABEL[o.status].toLowerCase()}</strong>
                {["CANCELLED", "RETURNED"].includes(o.status) ? " — stock has been restored. This is a final state." : "."}
              </div>
            )}

            {allowed.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                {canNext && (
                  <button className="a-btn a-btn-gold" onClick={() => setTarget(nextFlow)}>
                    Advance to {ORDER_STATUS_LABEL[nextFlow]} <ChevronRight />
                  </button>
                )}
                {forwardOptions.length > 0 && (
                  <select className="a-input !w-auto" value="" onChange={(e) => e.target.value && setTarget(e.target.value)} aria-label="Skip to status">
                    <option value="">Skip to…</option>
                    {forwardOptions.map((s) => (
                      <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                )}
                <span className="flex-1" />
                {sideActions.map((s) => {
                  const m = ACTION_META[s];
                  return (
                    <button key={s} className={cn("a-btn", m.cls)} onClick={() => setTarget(s)}>
                      <m.icon /> {m.label}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Items */}
          <Card title={`Items (${itemCount})`} icon={PackageOpen} bodyClass="!p-0">
            <ul className="divide-y divide-line">
              {o.items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 p-3 sm:p-4">
                  <div className="h-14 w-14 flex-none overflow-hidden rounded-lg border border-line bg-ink-3">
                    {it.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.image} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-wider text-gold">{it.brand}</div>
                    {it.product ? (
                      <Link href={`/admin/products/${it.product.id}`} className="line-clamp-2 text-[13.5px] hover:text-gold-2">{it.name}</Link>
                    ) : (
                      <div className="line-clamp-2 text-[13.5px]">{it.name}</div>
                    )}
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11.5px] text-mute">
                      <span className="a-num">SKU {it.sku}</span>
                      {it.product && <span>In stock: <span className="a-num">{it.product.stock}</span></span>}
                      {it.product && (
                        <a href={storeUrl(`/watches/${it.product.slug}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-bone">
                          Storefront <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="a-num text-[13.5px]">{formatINR(it.price * it.quantity)}</div>
                    <div className="a-num text-[11.5px] text-mute">{it.quantity} × {formatINR(it.price)}</div>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-line p-4 text-[13px]">
              <Row label="Subtotal" value={formatINR(o.subtotal)} />
              {o.discount > 0 && <Row label={`Discount${o.couponCode ? ` (${o.couponCode})` : ""}`} value={`− ${formatINR(o.discount)}`} className="text-lume" />}
              <Row label="Shipping" value={o.shippingFee ? formatINR(o.shippingFee) : "Free"} />
              {o.codFee > 0 && <Row label="COD fee" value={formatINR(o.codFee)} />}
              <div className="!mt-3 flex items-center justify-between border-t border-line pt-3">
                <dt className="font-medium">Total</dt>
                <dd className="a-num text-[18px] text-gold-2">{formatINR(o.total)}</dd>
              </div>
            </dl>
          </Card>

          {/* Timeline */}
          <Card title="Timeline" icon={ClipboardList}>
            <form method="post" onSubmit={addNote} className="mb-4 flex gap-2">
              <input className="a-input" value={internal} onChange={(e) => setInternal(e.target.value)} placeholder="Add an internal note (visible to staff only)…" maxLength={1000} />
              <button className="a-btn" disabled={noteBusy || !internal.trim()}>
                {noteBusy ? <Spinner /> : <MessageSquarePlus />} <span className="hidden sm:inline">Add note</span>
              </button>
            </form>
            {o.events.length === 0 ? (
              <p className="text-[12.5px] text-mute">No events yet.</p>
            ) : (
              <ol className="relative ml-2 border-l border-line-2">
                {o.events.map((e, i) => (
                  <li key={e.id} className="relative pb-4 pl-5 last:pb-0">
                    <span className={cn("absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border", i === 0 ? "border-gold bg-gold" : "border-line-2 bg-ink-4")} />
                    <div className="flex flex-wrap items-center gap-2">
                      <OrderStatusPill status={e.status} />
                      <span className="text-[11.5px] text-mute" title={fmtDate(e.createdAt, true)}>{fmtDate(e.createdAt, true)} · {timeAgo(e.createdAt)}</span>
                    </div>
                    {e.note && <p className="mt-1 whitespace-pre-wrap text-[12.5px] text-bone-2">{e.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Customer" icon={User}>
            <div className="text-[14px] font-medium">{o.shippingName}</div>
            <div className="mt-1 space-y-0.5 text-[12.5px] text-bone-2">
              <a href={`mailto:${o.email}`} className="block truncate hover:text-gold-2">{o.email}</a>
              <a href={`tel:${o.phone}`} className="a-num block hover:text-gold-2">{o.phone}</a>
            </div>
            {o.user ? (
              <Link href={`/admin/customers/${o.user.id}`} className="mt-3 inline-flex items-center gap-1 text-[12px] text-gold-2 hover:underline">
                View account · {o.user._count.orders} order{o.user._count.orders === 1 ? "" : "s"} <ChevronRight className="h-3 w-3" />
              </Link>
            ) : (
              <div className="mt-3 text-[11.5px] text-mute">Guest checkout</div>
            )}
            {o.user?.isBlocked && <div className="mt-2"><Pill tone="danger">Blocked account</Pill></div>}
          </Card>

          <Card title="Ship to" icon={MapPin} actions={<CopyButton text={addressLines(o).join("\n")} label="Copy" />}>
            <address className="space-y-0.5 text-[13px] not-italic text-bone-2">
              {addressLines(o).map((l, i) => (
                <div key={i} className={i === 0 ? "font-medium text-bone" : ""}>{l}</div>
              ))}
            </address>
          </Card>

          <Card title="Payment" icon={CreditCard}>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-mute">Method</span>
              <span>{o.paymentMethod === "COD" ? "Cash on delivery" : "Razorpay (prepaid)"}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[13px]">
              <span className="text-mute">Status</span>
              <Pill tone={PAYMENT_TONE[o.paymentStatus]}>{o.paymentStatus.toLowerCase()}</Pill>
            </div>
            {o.razorpayId && (
              <div className="mt-2 flex items-center justify-between text-[12px]">
                <span className="text-mute">Razorpay ID</span>
                <span className="a-num truncate">{o.razorpayId}</span>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {o.paymentStatus !== "PAID" && o.paymentStatus !== "REFUNDED" && (
                <button className="a-btn a-btn-sm" onClick={() => payment("PAID")}>
                  <CircleDollarSign /> Mark paid
                </button>
              )}
              {o.paymentStatus === "PAID" && (
                <button className="a-btn a-btn-sm a-btn-ghost" onClick={() => payment("REFUNDED")}>
                  <RotateCcw /> Mark refunded
                </button>
              )}
            </div>
          </Card>

          <Card
            title="Shipping"
            icon={Truck}
            actions={!shipEdit && <button className="a-btn a-btn-sm a-btn-ghost" onClick={() => setShipEdit(true)}>Edit</button>}
          >
            {shipEdit ? (
              <div className="space-y-2">
                <Field label="Courier"><input className="a-input" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Delhivery, Blue Dart…" /></Field>
                <Field label="Tracking number"><input className="a-input a-num" value={tracking} onChange={(e) => setTracking(e.target.value)} /></Field>
                <div className="flex justify-end gap-2">
                  <button className="a-btn a-btn-sm a-btn-ghost" onClick={() => setShipEdit(false)}>Cancel</button>
                  <button className="a-btn a-btn-sm a-btn-gold" onClick={saveShipping}>Save</button>
                </div>
              </div>
            ) : o.courier || o.trackingNumber ? (
              <div className="space-y-1 text-[13px]">
                <div className="flex justify-between gap-2"><span className="text-mute">Courier</span><span>{o.courier || "—"}</span></div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-mute">Tracking</span>
                  <span className="flex items-center gap-1">
                    <span className="a-num">{o.trackingNumber || "—"}</span>
                    {o.trackingNumber && <CopyButton text={o.trackingNumber} className="a-btn a-btn-sm a-btn-ghost a-btn-icon" />}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[12.5px] text-mute">Not shipped yet. Courier & tracking are captured when you mark it shipped.</p>
            )}
          </Card>

          <Card title="COD risk" icon={ShieldAlert}>
            <div className="flex items-center gap-3">
              <RiskPill score={o.riskScore} reason={o.riskReason} />
              {o.riskScore === null || o.riskScore === undefined ? (
                <span className="text-[12px] text-mute">Not scored</span>
              ) : (
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-4">
                  <div
                    className={cn("h-full rounded-full", o.riskScore >= 70 ? "bg-danger" : o.riskScore >= 40 ? "bg-ember" : "bg-lume")}
                    style={{ width: `${Math.min(100, Math.max(2, o.riskScore))}%` }}
                  />
                </div>
              )}
            </div>
            {o.riskReason && <p className="mt-2 text-[12.5px] text-bone-2">{o.riskReason}</p>}
            {o.riskScore >= 40 && o.paymentMethod === "COD" && o.status === "PENDING" && (
              <p className="mt-2 text-[11.5px] text-mute">Tip: verify on WhatsApp before confirming.</p>
            )}
          </Card>

          {o.notes && (
            <Card title="Customer note">
              <p className="whitespace-pre-wrap text-[13px] text-bone-2">{o.notes}</p>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={!!target}
        onClose={() => !busy && setTarget(null)}
        title={target ? `Move to ${ORDER_STATUS_LABEL[target]}` : ""}
        width={460}
        footer={
          <>
            <button className="a-btn a-btn-ghost" onClick={() => setTarget(null)} disabled={busy}>Close</button>
            <button className={cn("a-btn", target === "CANCELLED" ? "a-btn-danger" : "a-btn-gold")} onClick={submitStatus} disabled={busy}>
              {busy && <Spinner />} Confirm
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {target === "SHIPPED" && (
            <>
              <Field label="Courier *"><input autoFocus className="a-input" value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Delhivery, Blue Dart, DTDC…" /></Field>
              <Field label="Tracking number *"><input className="a-input a-num" value={tracking} onChange={(e) => setTracking(e.target.value)} /></Field>
            </>
          )}
          {(target === "CANCELLED" || target === "RETURNED") && (
            <p className="rounded-lg border border-line-2 bg-ink-3 px-3 py-2 text-[12.5px] text-bone-2">
              Stock for {itemCount} unit{itemCount === 1 ? "" : "s"} will be returned to inventory. This cannot be undone.
            </p>
          )}
          {target === "DELIVERED" && o.paymentMethod === "COD" && o.paymentStatus !== "PAID" && (
            <p className="text-[12.5px] text-lume">COD payment will be marked as collected (paid).</p>
          )}
          <Field label="Note (optional)" hint="Saved to the order timeline.">
            <textarea className="a-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} autoFocus={target !== "SHIPPED"} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value, className }) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <dt className="text-mute">{label}</dt>
      <dd className="a-num">{value}</dd>
    </div>
  );
}
