"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, ExternalLink, FileDown, MapPin, Navigation, RefreshCw, Route, Truck } from "lucide-react";
import { cn, formatINR } from "@/lib/utils";
import { api } from "../fetcher";
import { Card, ConfirmButton, CopyButton, Pill, Spinner, fmtDate, TimeAgo } from "../ui";

const STALE_MS = 15 * 60_000;

/** Pill colour for a Shiprocket status label. */
export function shipTone(label) {
  const s = String(label || "").toUpperCase();
  if (s === "DELIVERED") return "lume";
  if (/RTO|CANCEL|LOST|DAMAGED|UNDELIVERED|EXCEPTION|ERROR/.test(s)) return "danger";
  if (/OUT FOR DELIVERY|IN TRANSIT|SHIPPED|PICKED|REACHED/.test(s)) return "info";
  return "gold";
}

export const isActiveShipment = (sh) => Boolean(sh && sh.awb && !sh.cancelledAt);

function istLabel(s) {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(String(s || ""));
  return m ? fmtDate(`${m[1]}T${m[2]}:00+05:30`, true) : s || "—";
}

/** Sidebar card: courier, AWB, status and actions for a booked shipment. */
export function ShipmentCard({ orderId, orderStatus, shipment: sh }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const auto = useRef(false);

  async function run(action, success, { quiet = false } = {}) {
    setBusy(action);
    try {
      const r = await api(`/api/admin/orders/${orderId}/shipment`, { method: "POST", body: { action } });
      if (!quiet) {
        if (r.pending) toast.info(r.message || "No tracking events yet");
        else if (success) toast.success(success);
      }
      router.refresh();
      return r;
    } catch (e) {
      if (!quiet) toast.error(e.message);
      throw e;
    } finally {
      setBusy("");
    }
  }

  // Quietly pull fresh tracking when the page opens and the data is old.
  useEffect(() => {
    if (auto.current || !isActiveShipment(sh) || sh.closed) return;
    const age = sh.lastSyncedAt ? Date.now() - new Date(sh.lastSyncedAt).getTime() : Infinity;
    if (age < STALE_MS) return;
    auto.current = true;
    run("refresh", null, { quiet: true }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sh?.id]);

  const open = (url) => window.open(url, "_blank", "noopener");
  const fileAction = async (action, key) => {
    const url = sh[key] || (await run(action, null).then((r) => r.shipment?.[key]).catch(() => null));
    if (url) open(url);
  };
  const cancellable = ["PENDING", "CONFIRMED", "PACKED"].includes(orderStatus) && !sh.closed;
  const needsPickup = !sh.pickupScheduledAt || /pickup/i.test(sh.lastError || "");

  return (
    <div className="space-y-3 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={shipTone(sh.status)}>{sh.status || "Booked"}</Pill>
        {sh.rto && <Pill tone="danger">Returning to origin</Pill>}
      </div>
      <dl className="space-y-1.5">
        <Row label="Courier" value={sh.courierName || "—"} />
        <div className="flex items-center justify-between gap-2">
          <dt className="text-mute">AWB</dt>
          <dd className="flex items-center gap-1">
            <span className="a-num">{sh.awb}</span>
            <CopyButton text={sh.awb} className="a-btn a-btn-sm a-btn-ghost a-btn-icon" />
          </dd>
        </div>
        {sh.etd && <Row label="Expected by" value={istLabel(sh.etd)} />}
        {sh.deliveredAt && <Row label="Delivered" value={fmtDate(sh.deliveredAt, true)} />}
        {sh.pickupScheduledAt && !sh.deliveredAt && <Row label="Pickup" value={istLabel(sh.pickupScheduledAt)} />}
        {sh.charge != null && <Row label="Shipping cost" value={formatINR(Math.round(sh.charge))} />}
        <Row label="Package" value={`${sh.weightKg} kg · ${sh.lengthCm}×${sh.breadthCm}×${sh.heightCm} cm`} />
        <Row label="Shiprocket order" value={<span className="a-num">{sh.srOrderId} / {sh.srShipmentId}</span>} />
      </dl>
      {sh.lastError && <p className="rounded-lg border border-danger/30 bg-danger/[.05] p-2 text-[12px] text-danger">{sh.lastError}</p>}

      <div className="flex flex-wrap gap-1.5">
        {sh.trackUrl && (
          <button type="button" className="a-btn a-btn-sm a-btn-ghost" onClick={() => open(sh.trackUrl)}>
            <Navigation /> Track
          </button>
        )}
        <button type="button" className="a-btn a-btn-sm a-btn-ghost" disabled={!!busy} onClick={() => fileAction("label", "labelUrl")}>
          {busy === "label" ? <Spinner /> : <FileDown />} Label
        </button>
        <button type="button" className="a-btn a-btn-sm a-btn-ghost" disabled={!!busy} onClick={() => fileAction("manifest", "manifestUrl")}>
          {busy === "manifest" ? <Spinner /> : <FileDown />} Manifest
        </button>
        {needsPickup && !sh.closed && (
          <button type="button" className="a-btn a-btn-sm a-btn-ghost" disabled={!!busy} onClick={() => run("pickup", "Pickup requested").catch(() => {})}>
            {busy === "pickup" ? <Spinner /> : <Truck />} Request pickup
          </button>
        )}
        <button type="button" className="a-btn a-btn-sm a-btn-ghost" disabled={!!busy} onClick={() => run("refresh", "Tracking updated").catch(() => {})}>
          {busy === "refresh" ? <Spinner /> : <RefreshCw />} Refresh
        </button>
        {cancellable && (
          <ConfirmButton
            className="a-btn a-btn-sm a-btn-ghost text-danger"
            title="Cancel this shipment?"
            message={`The Shiprocket order and AWB ${sh.awb} will be cancelled and the courier will not pick it up. The order itself stays open so you can book again.`}
            confirmLabel="Cancel shipment"
            onConfirm={() => run("cancel", "Shipment cancelled")}
          >
            <Ban /> Cancel
          </ConfirmButton>
        )}
      </div>
      <p className="text-[11px] text-mute">
        {sh.lastSyncedAt ? `Tracking checked $<TimeAgo date={sh.lastSyncedAt} />` : "Waiting for the first tracking update"} · updates arrive automatically
      </p>
    </div>
  );
}

/** Main-column card: every courier scan, newest first. */
export function TrackingTimeline({ shipment: sh }) {
  const scans = Array.isArray(sh?.activities) ? sh.activities : [];
  return (
    <Card
      title="Shipment tracking"
      icon={Route}
      actions={sh.trackUrl && (
        <a href={sh.trackUrl} target="_blank" rel="noreferrer" className="a-btn a-btn-sm a-btn-ghost">
          Public tracking page <ExternalLink />
        </a>
      )}
    >
      {scans.length === 0 ? (
        <p className="text-[12.5px] text-mute">No courier scans yet — they appear here once {sh.courierName || "the courier"} picks up the parcel.</p>
      ) : (
        <ol className="relative ml-2 border-l border-line-2">
          {scans.map((s, i) => (
            <li key={`${s.date}-${i}`} className="relative pb-4 pl-5 last:pb-0">
              <span className={cn("absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border", i === 0 ? "border-gold bg-gold" : "border-line-2 bg-ink-4")} />
              <div className="flex flex-wrap items-center gap-2">
                {s.status && <Pill tone={shipTone(s.status)}>{s.status}</Pill>}
                <span className="text-[11.5px] text-mute">{istLabel(s.date)}</span>
              </div>
              {s.activity && <p className="mt-1 text-[12.5px] text-bone-2">{s.activity}</p>}
              {s.location && (
                <p className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] text-mute">
                  <MapPin className="h-3 w-3" /> {s.location}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-mute">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
