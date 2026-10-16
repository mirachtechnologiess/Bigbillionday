"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarRange, Download, PackageCheck, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { cn, formatINR, ORDER_STATUS_LABEL } from "@/lib/utils";
import { api } from "../fetcher";
import {
  Empty, OrderStatusPill, PageHeader, Pagination, PAYMENT_TONE, Pill, RiskPill, SearchInput, Spinner, Tabs, fmtDate, timeAgo, useQueryState,
} from "../ui";

const STATUS_TABS = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURN_REQUESTED", "RETURNED"];
const BULK = ["CONFIRMED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

export default function OrdersList({ rows, counts, page, pages, total }) {
  const router = useRouter();
  const { sp, set, pending } = useQueryState();
  const status = sp.get("status") || "ALL";
  const [selected, setSelected] = useState(() => new Set());
  const [bulkStatus, setBulkStatus] = useState("CONFIRMED");
  const [busy, setBusy] = useState(false);

  // drop selection when the data set changes
  const key = rows.map((r) => r.id).join(",");
  useEffect(() => setSelected(new Set()), [key]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)));

  const exportHref = useMemo(() => {
    const p = new URLSearchParams(sp.toString());
    p.delete("page");
    return `/api/admin/orders/export?${p.toString()}`;
  }, [sp]);

  const hasFilters = ["q", "from", "to", "pm"].some((k) => sp.get(k));

  async function applyBulk() {
    setBusy(true);
    try {
      const r = await api("/api/admin/orders/bulk", { method: "POST", body: { ids: [...selected], status: bulkStatus } });
      toast.success(`${r.updated} order${r.updated === 1 ? "" : "s"} → ${ORDER_STATUS_LABEL[bulkStatus]}`);
      if (r.skipped?.length) toast.warning(`Skipped ${r.skipped.length} (transition not allowed): ${r.skipped.slice(0, 6).join(", ")}${r.skipped.length > 6 ? "…" : ""}`);
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title="Orders"
        description="Every order from checkout to doorstep. Filter, verify COD risk, and move them along the line."
        actions={
          <a href={exportHref} className="a-btn a-btn-ghost" download>
            <Download /> Export CSV
          </a>
        }
      />

      <Tabs
        className="mb-4"
        value={status}
        onChange={(v) => set({ status: v === "ALL" ? null : v })}
        tabs={[{ value: "ALL", label: "All", count: counts.ALL }, ...STATUS_TABS.map((s) => ({ value: s, label: ORDER_STATUS_LABEL[s], count: counts[s] || 0 }))]}
      />

      <div className="mb-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <SearchInput className="col-span-2 sm:w-72" placeholder="Order #, phone, name or email" />
        <label className="relative">
          <span className="sr-only">From date</span>
          <input type="date" className="a-input sm:w-40" value={sp.get("from") || ""} onChange={(e) => set({ from: e.target.value })} aria-label="From date" />
        </label>
        <label className="relative">
          <span className="sr-only">To date</span>
          <input type="date" className="a-input sm:w-40" value={sp.get("to") || ""} onChange={(e) => set({ to: e.target.value })} aria-label="To date" />
        </label>
        <select className="a-input col-span-2 sm:w-40" value={sp.get("pm") || ""} onChange={(e) => set({ pm: e.target.value })} aria-label="Payment method">
          <option value="">All payments</option>
          <option value="COD">Cash on delivery</option>
          <option value="RAZORPAY">Prepaid (Razorpay)</option>
        </select>
        {hasFilters && (
          <button className="a-btn a-btn-ghost a-btn-sm col-span-2 sm:col-auto" onClick={() => set({ q: null, from: null, to: null, pm: null })}>
            <X /> Clear filters
          </button>
        )}
        {pending && <Spinner className="text-mute" />}
      </div>

      {selected.size > 0 && (
        <div className="sticky top-2 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-gold/40 bg-ink-3/95 p-2.5 backdrop-blur">
          <span className="a-num px-1 text-[12.5px] text-gold-2">{selected.size} selected</span>
          <span className="text-mute">→</span>
          <select className="a-input a-input-sm !w-auto" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} aria-label="Bulk status">
            {BULK.map((s) => (
              <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>
            ))}
          </select>
          <button className={cn("a-btn a-btn-sm", bulkStatus === "CANCELLED" ? "a-btn-danger" : "a-btn-gold")} onClick={applyBulk} disabled={busy}>
            {busy ? <Spinner /> : <PackageCheck />} Apply
          </button>
          <button className="a-btn a-btn-ghost a-btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
          <span className="hidden text-[11.5px] text-mute md:inline">Shipping needs courier + tracking — do it per order.</span>
        </div>
      )}

      {rows.length === 0 ? (
        <Empty icon={ShoppingBag} title="No orders found">
          {hasFilters || status !== "ALL" ? "Try widening the date range or clearing filters." : "Orders will land here the moment a customer checks out."}
        </Empty>
      ) : (
        <>
          {/* Mobile: card list */}
          <ul className="space-y-2 sm:hidden">
            {rows.map((o) => (
              <li key={o.id} className={cn("a-card flex gap-3 p-3", selected.has(o.id) && "border-gold/50")}>
                <input type="checkbox" className="a-check mt-1" checked={selected.has(o.id)} onChange={() => toggle(o.id)} aria-label={`Select ${o.orderNumber}`} />
                <Link href={`/admin/orders/${o.id}`} className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="a-num text-[13px] text-gold-2">#{o.orderNumber}</div>
                      <div className="truncate text-[13.5px] font-medium">{o.shippingName}</div>
                      <div className="truncate text-[11.5px] text-mute">{o.phone} · {o.city}</div>
                    </div>
                    <div className="text-right">
                      <div className="a-num text-[14px]">{formatINR(o.total)}</div>
                      <div className="text-[11px] text-mute">{timeAgo(o.createdAt)}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <OrderStatusPill status={o.status} />
                    <Pill tone={PAYMENT_TONE[o.paymentStatus]} dot={false}>{o.paymentMethod === "COD" ? "COD" : "Prepaid"} · {o.paymentStatus.toLowerCase()}</Pill>
                    <RiskPill score={o.riskScore} reason={o.riskReason} />
                    <span className="text-[11px] text-mute">{o.itemCount} item{o.itemCount === 1 ? "" : "s"}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="a-table-wrap hidden sm:block">
            <table className="a-table">
              <thead>
                <tr>
                  <th className="w-8"><input type="checkbox" className="a-check" checked={allChecked} onChange={toggleAll} aria-label="Select all" /></th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th className="text-right">Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>Placed</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} data-selected={selected.has(o.id)} className="cursor-pointer" onClick={(e) => {
                    if (e.target.closest("a,input,button")) return;
                    router.push(`/admin/orders/${o.id}`);
                  }}>
                    <td><input type="checkbox" className="a-check" checked={selected.has(o.id)} onChange={() => toggle(o.id)} aria-label={`Select ${o.orderNumber}`} /></td>
                    <td>
                      <Link href={`/admin/orders/${o.id}`} className="a-num text-gold-2 hover:underline">#{o.orderNumber}</Link>
                    </td>
                    <td className="max-w-[220px]">
                      <div className="truncate font-medium">{o.shippingName}</div>
                      <div className="truncate text-[11.5px] text-mute">{o.phone} · {o.city}, {o.state}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {o.thumbs.slice(0, 3).map((src, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={src} alt="" className="h-7 w-7 rounded-md border border-line-2 bg-ink-3 object-cover" />
                          ))}
                        </div>
                        <span className="max-w-[160px] truncate text-[12px] text-bone-2" title={o.firstItem}>
                          {o.itemCount > 1 ? `${o.itemCount} items` : o.firstItem}
                        </span>
                      </div>
                    </td>
                    <td className="a-num text-right">{formatINR(o.total)}</td>
                    <td>
                      <Pill tone={PAYMENT_TONE[o.paymentStatus]} dot={false}>{o.paymentMethod === "COD" ? "COD" : "Prepaid"} · {o.paymentStatus.toLowerCase()}</Pill>
                    </td>
                    <td><OrderStatusPill status={o.status} /></td>
                    <td><RiskPill score={o.riskScore} reason={o.riskReason} /></td>
                    <td className="whitespace-nowrap text-[12px] text-mute" title={fmtDate(o.createdAt, true)}>
                      <CalendarRange className="mr-1 inline h-3 w-3" />
                      {timeAgo(o.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="flex items-center gap-3">
        {rows.length > 0 && (
          <label className="mt-3 flex items-center gap-2 text-xs text-mute sm:hidden">
            <input type="checkbox" className="a-check" checked={allChecked} onChange={toggleAll} /> Select all on page
          </label>
        )}
        <div className="flex-1">
          <Pagination page={page} pages={pages} total={total} />
        </div>
      </div>
    </div>
  );
}
