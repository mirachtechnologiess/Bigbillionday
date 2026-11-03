"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Clock, IndianRupee, PackageCheck, Search, Star, Truck } from "lucide-react";
import { cn, formatINR } from "@/lib/utils";
import { api } from "../fetcher";
import { Field, Modal, Pill, Spinner } from "../ui";

const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "cheapest", label: "Cheapest" },
  { value: "fastest", label: "Fastest" },
  { value: "rating", label: "Best rated" },
];

const rupees = (n) => (n == null ? "—" : formatINR(Math.round(n)));

function sortCouriers(list, by, recommendedId) {
  const days = (c) => c.days ?? 99;
  const s = [...list];
  if (by === "cheapest") s.sort((a, b) => a.rate - b.rate || days(a) - days(b));
  else if (by === "fastest") s.sort((a, b) => days(a) - days(b) || a.rate - b.rate);
  else if (by === "rating") s.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.rate - b.rate);
  else s.sort((a, b) => (b.id === recommendedId) - (a.id === recommendedId) || (b.rating ?? 0) - (a.rating ?? 0) || a.rate - b.rate);
  return s;
}

/**
 * Book an order with a courier through Shiprocket:
 * package → available couriers (price / speed / rating) → one click creates order + AWB + pickup + label.
 */
export default function ShipModal({ orderId, orderNumber, open, onClose, onBooked }) {
  const [info, setInfo] = useState(null);
  const [pkg, setPkg] = useState(null);
  const [quote, setQuote] = useState(null);
  const [sort, setSort] = useState("recommended");
  const [pick, setPick] = useState(null);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!open) return;
    setInfo(null);
    setQuote(null);
    setPick(null);
    setSort("recommended");
    api(`/api/admin/orders/${orderId}/shipment`)
      .then((r) => {
        setInfo(r);
        setPkg(r.package);
      })
      .catch((e) => {
        toast.error(e.message);
        onClose();
      });
  }, [open, orderId, onClose]);

  const couriers = useMemo(() => (quote ? sortCouriers(quote.couriers, sort, quote.recommendedId) : []), [quote, sort]);
  const chosen = quote?.couriers.find((c) => c.id === pick);

  async function findCouriers(e) {
    e?.preventDefault();
    setBusy("quote");
    try {
      const q = await api(`/api/admin/orders/${orderId}/shipment`, { method: "POST", body: { action: "quote", pkg } });
      setQuote(q);
      setPkg(q.package);
      setPick(q.recommendedId && q.couriers.some((c) => c.id === q.recommendedId) ? q.recommendedId : sortCouriers(q.couriers, "recommended")[0]?.id);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy("");
    }
  }

  async function book() {
    if (!chosen) return;
    setBusy("book");
    try {
      const { shipment } = await api(`/api/admin/orders/${orderId}/shipment`, {
        method: "POST",
        body: { action: "create", courierId: chosen.id, rate: chosen.rate, pkg: quote.package },
      });
      toast.success(`Booked with ${shipment.courierName} · AWB ${shipment.awb}`);
      if (shipment.lastError) toast.warning(shipment.lastError);
      onBooked?.(shipment);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy("");
    }
  }

  const set = (k) => (e) => {
    setPkg((p) => ({ ...p, [k]: e.target.value }));
    setQuote(null);
  };

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title={`Ship #${orderNumber} with Shiprocket`}
      width={720}
      footer={
        quote && (
          <>
            <button className="a-btn a-btn-ghost" onClick={onClose} disabled={!!busy}>Cancel</button>
            <button className="a-btn a-btn-gold" onClick={book} disabled={!chosen || !!busy}>
              {busy === "book" ? <Spinner /> : <PackageCheck />}
              {busy === "book" ? "Booking…" : chosen ? `Book ${chosen.name} · ${rupees(chosen.rate)}` : "Choose a courier"}
            </button>
          </>
        )
      }
    >
      {!info ? (
        <div className="flex items-center gap-2 py-8 text-[13px] text-mute"><Spinner /> Loading…</div>
      ) : !info.ready ? (
        <div className="space-y-2 py-2 text-[13px]">
          <p>Shiprocket isn’t set up yet. Connect your Shiprocket API user and choose the pickup address first.</p>
          <Link href="/admin/settings?tab=shipping" className="a-btn a-btn-sm a-btn-gold">Open Settings → Shipping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          <form method="post" onSubmit={findCouriers} className="rounded-xl border border-line bg-ink-2 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[12px] text-mute">
              <span>Pickup: <span className="text-bone">{info.pickup.name}</span> · {info.pickup.pincode}</span>
              <span>Package (edit if this parcel is bigger)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Field label="Weight (kg)"><input className="a-input a-num" inputMode="decimal" value={pkg?.weightKg ?? ""} onChange={set("weightKg")} /></Field>
              <Field label="Length (cm)"><input className="a-input a-num" inputMode="numeric" value={pkg?.lengthCm ?? ""} onChange={set("lengthCm")} /></Field>
              <Field label="Breadth (cm)"><input className="a-input a-num" inputMode="numeric" value={pkg?.breadthCm ?? ""} onChange={set("breadthCm")} /></Field>
              <Field label="Height (cm)"><input className="a-input a-num" inputMode="numeric" value={pkg?.heightCm ?? ""} onChange={set("heightCm")} /></Field>
              <div className="col-span-2 flex items-end sm:col-span-1">
                <button className="a-btn a-btn-gold w-full" disabled={!!busy}>
                  {busy === "quote" ? <Spinner /> : <Search />} {quote ? "Refresh" : "Find couriers"}
                </button>
              </div>
            </div>
          </form>

          {quote && (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[12.5px] text-mute">
                  {quote.couriers.length} courier{quote.couriers.length === 1 ? "" : "s"} · {quote.cod ? "Cash on delivery" : "Prepaid"} · charged weight {quote.package.weightKg} kg
                </div>
                <div className="flex gap-1">
                  {SORTS.map((s) => (
                    <button key={s.value} type="button" onClick={() => setSort(s.value)} className={cn("a-btn a-btn-sm", sort === s.value ? "a-btn-gold" : "a-btn-ghost")}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <ul className="max-h-[46vh] divide-y divide-line overflow-auto rounded-xl border border-line" role="radiogroup" aria-label="Courier">
                {couriers.map((c) => (
                  <li key={c.id}>
                    <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-ink-2", pick === c.id && "bg-gold-3")}>
                      <input type="radio" name="courier" className="accent-[var(--color-gold)]" checked={pick === c.id} onChange={() => setPick(c.id)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium">
                          {c.name}
                          {c.id === quote.recommendedId && <Pill tone="lume">Recommended</Pill>}
                          <Pill tone="mute" dot={false}>{c.surface ? "Surface" : "Air"}</Pill>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11.5px] text-mute">
                          <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" />{c.rating ?? "—"}</span>
                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{c.days ? `${c.days} day${c.days === 1 ? "" : "s"}` : "—"}{c.etd ? ` · by ${c.etd}` : ""}</span>
                          {c.deliveryPerformance != null && <span>Delivery score {c.deliveryPerformance}</span>}
                          {c.rtoCharges != null && <span>RTO {rupees(c.rtoCharges)}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="a-num inline-flex items-center text-[14px] font-semibold"><IndianRupee className="h-3.5 w-3.5" />{Math.round(c.rate)}</div>
                        {c.codCharges > 0 && <div className="text-[11px] text-mute">incl. COD {rupees(c.codCharges)}</div>}
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-mute">
                <Truck className="h-3.5 w-3.5" /> Booking creates the order in Shiprocket, assigns the AWB, requests pickup and makes the label. The charge is taken from your Shiprocket wallet.
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
