"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dices, Pencil, Plus, Search, TicketPercent, Trash2 } from "lucide-react";
import { api } from "@/components/admin/fetcher";
import { Card, ConfirmButton, CopyButton, Empty, Field, Modal, PageHeader, Pill, Spinner, Tabs, Toggle, fmtDate } from "@/components/admin/ui";
import { cn, formatINR } from "@/lib/utils";

/* ── IST helpers for <input type="datetime-local"> ── */
const IST_MS = 330 * 60_000;
const isoToIstLocal = (iso) => (iso ? new Date(new Date(iso).getTime() + IST_MS).toISOString().slice(0, 16) : "");
const istLocalToIso = (v) => (v ? new Date(`${v}:00+05:30`).toISOString() : null);

function couponStatus(c, now = Date.now()) {
  if (!c.isActive) return { label: "Inactive", tone: "mute" };
  if (c.endsAt && new Date(c.endsAt).getTime() < now) return { label: "Expired", tone: "danger" };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return { label: "Exhausted", tone: "ember" };
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return { label: "Scheduled", tone: "info" };
  return { label: "Active", tone: "lume" };
}

function randomCode(len = 8) {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => abc[n % abc.length]).join("");
}

const EMPTY = { code: "", description: "", type: "PERCENT", value: 10, minOrder: 0, maxDiscount: "", usageLimit: "", startsAt: "", endsAt: "", isActive: true };

const toForm = (c) =>
  c
    ? {
        code: c.code,
        description: c.description || "",
        type: c.type,
        value: c.value,
        minOrder: c.minOrder,
        maxDiscount: c.maxDiscount ?? "",
        usageLimit: c.usageLimit ?? "",
        startsAt: isoToIstLocal(c.startsAt),
        endsAt: isoToIstLocal(c.endsAt),
        isActive: c.isActive,
      }
    : { ...EMPTY };

const FILTERS = ["All", "Active", "Scheduled", "Expired", "Exhausted", "Inactive"];

export default function CouponsManager({ coupons, canDelete }) {
  const router = useRouter();
  const [rows, setRows] = useState(coupons);
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | coupon
  const [now] = useState(() => Date.now());

  useEffect(() => setRows(coupons), [coupons]);

  const withStatus = useMemo(() => rows.map((c) => ({ ...c, status: couponStatus(c, now) })), [rows, now]);
  const counts = useMemo(() => {
    const m = { All: withStatus.length };
    for (const c of withStatus) m[c.status.label] = (m[c.status.label] || 0) + 1;
    return m;
  }, [withStatus]);
  const visible = withStatus.filter(
    (c) => (filter === "All" || c.status.label === filter) && (!q || c.code.includes(q.toUpperCase()) || (c.description || "").toLowerCase().includes(q.toLowerCase()))
  );
  const redemptions = rows.reduce((s, c) => s + c.usedCount, 0);

  const toggleActive = async (c, isActive) => {
    setRows((rs) => rs.map((r) => (r.id === c.id ? { ...r, isActive } : r)));
    try {
      await api(`/api/admin/coupons/${c.id}`, { method: "PATCH", body: { isActive } });
      toast.success(`${c.code} ${isActive ? "activated" : "paused"}`);
      router.refresh();
    } catch (e) {
      setRows((rs) => rs.map((r) => (r.id === c.id ? { ...r, isActive: !isActive } : r)));
      toast.error(e.message);
    }
  };

  const remove = async (c) => {
    await api(`/api/admin/coupons/${c.id}`, { method: "DELETE" });
    toast.success(`Deleted ${c.code}`);
    setRows((rs) => rs.filter((r) => r.id !== c.id));
    router.refresh();
  };

  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title="Coupons"
        description="Discount codes for checkout. Percent or flat off, with minimum order, caps, usage limits and a time window (IST)."
        actions={
          <button className="a-btn a-btn-gold" onClick={() => setEditing("new")}>
            <Plus /> New coupon
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Live now", counts.Active || 0, "lume"],
          ["Scheduled", counts.Scheduled || 0, "info"],
          ["Expired / exhausted", (counts.Expired || 0) + (counts.Exhausted || 0), "ember"],
          ["Total redemptions", redemptions, "gold"],
        ].map(([label, v, tone]) => (
          <div key={label} className="a-card p-3.5">
            <div className="a-label !mb-1">{label}</div>
            <div className={cn("a-num text-2xl", tone === "lume" && "text-lume", tone === "gold" && "text-gold-2", tone === "ember" && "text-ember", tone === "info" && "text-teal")}>{v}</div>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs tabs={FILTERS.map((f) => ({ value: f, label: f, count: counts[f] || 0 }))} value={filter} onChange={setFilter} className="flex-1" />
        <div className="relative md:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
          <input className="a-input !pl-8" placeholder="Search code or note…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty icon={TicketPercent} title="No coupons yet" action={<button className="a-btn a-btn-gold" onClick={() => setEditing("new")}><Plus /> Create the first code</button>}>
          Launch codes like WELCOME10 or FESTIVE500 to nudge first orders and seasonal sales.
        </Empty>
      ) : (
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th className="hidden md:table-cell">Min order</th>
                <th className="hidden lg:table-cell">Max off</th>
                <th>Usage</th>
                <th className="hidden xl:table-cell">Window (IST)</th>
                <th>Status</th>
                <th className="w-px">Active</th>
                <th className="w-px" />
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => {
                const pct = c.usageLimit ? Math.min(100, (c.usedCount / c.usageLimit) * 100) : 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <button className="group text-left" onClick={() => setEditing(c)}>
                        <span className="font-mono text-[13px] tracking-wider text-bone group-hover:text-gold-2">{c.code}</span>
                        {c.description && <span className="block max-w-[220px] truncate text-[11.5px] text-mute">{c.description}</span>}
                      </button>
                    </td>
                    <td className="a-num whitespace-nowrap">
                      {c.type === "PERCENT" ? `${c.value}%` : formatINR(c.value)}
                      <span className="ml-1.5 text-[10.5px] uppercase tracking-wider text-mute">{c.type === "PERCENT" ? "off" : "flat"}</span>
                    </td>
                    <td className="a-num hidden md:table-cell">{c.minOrder ? formatINR(c.minOrder) : <span className="text-mute">—</span>}</td>
                    <td className="a-num hidden lg:table-cell">{c.maxDiscount ? formatINR(c.maxDiscount) : <span className="text-mute">—</span>}</td>
                    <td>
                      <div className="a-num text-[12px]">
                        {c.usedCount}
                        <span className="text-mute"> / {c.usageLimit ?? "∞"}</span>
                      </div>
                      {c.usageLimit ? (
                        <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-ink-4">
                          <div className={cn("h-full rounded-full", pct >= 100 ? "bg-ember" : pct >= 80 ? "bg-gold" : "bg-lume")} style={{ width: `${pct}%` }} />
                        </div>
                      ) : null}
                    </td>
                    <td className="hidden whitespace-nowrap text-[12px] text-bone-2 xl:table-cell">
                      {c.startsAt || c.endsAt ? (
                        <>
                          {c.startsAt ? fmtDate(c.startsAt, true) : "Now"} <span className="text-mute">→</span> {c.endsAt ? fmtDate(c.endsAt, true) : "No end"}
                        </>
                      ) : (
                        <span className="text-mute">Always</span>
                      )}
                    </td>
                    <td>
                      <Pill tone={c.status.tone}>{c.status.label}</Pill>
                    </td>
                    <td>
                      <Toggle checked={c.isActive} onChange={(v) => toggleActive(c, v)} />
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <CopyButton text={c.code} className="a-btn a-btn-ghost a-btn-sm a-btn-icon" />
                        <button className="a-btn a-btn-ghost a-btn-sm a-btn-icon" onClick={() => setEditing(c)} aria-label={`Edit ${c.code}`}>
                          <Pencil />
                        </button>
                        {canDelete && (
                          <ConfirmButton className="a-btn a-btn-ghost a-btn-sm a-btn-icon" ariaLabel={`Delete ${c.code}`} title={`Delete ${c.code}?`} message={c.usedCount ? `This code has been used ${c.usedCount} time(s). Past orders keep their discount; the code just stops working. Consider pausing instead.` : "The code will stop working immediately."} confirmLabel="Delete" onConfirm={() => remove(c)}>
                            <Trash2 />
                          </ConfirmButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-[13px] text-mute">
                    No coupons match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <CouponEditor
        key={editing === "new" ? "new" : editing?.id || "closed"}
        open={!!editing}
        coupon={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={(c) => {
          setRows((rs) => {
            const next = { ...c, startsAt: c.startsAt ?? null, endsAt: c.endsAt ?? null };
            return rs.some((r) => r.id === c.id) ? rs.map((r) => (r.id === c.id ? next : r)) : [next, ...rs];
          });
          setEditing(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function CouponEditor({ open, coupon, onClose, onSaved }) {
  const [f, setF] = useState(() => toForm(coupon));
  const [busy, setBusy] = useState(false);
  const set = (patch) => setF((s) => ({ ...s, ...patch }));

  const valueNum = Number(f.value) || 0;
  const errors = [];
  if (f.code && !/^[A-Z0-9_-]{3,30}$/.test(f.code)) errors.push("Code: 3–30 chars, A–Z 0–9 _ -");
  if (f.type === "PERCENT" && (valueNum < 1 || valueNum > 90)) errors.push("Percentage must be 1–90");
  if (f.type === "FLAT" && valueNum < 1) errors.push("Flat amount must be at least ₹1");
  if (f.startsAt && f.endsAt && f.endsAt <= f.startsAt) errors.push("End must be after start");

  // a worked example so the admin sees what the code really does
  const exampleOrder = Math.max(Number(f.minOrder) || 0, 5000);
  let exampleOff = f.type === "PERCENT" ? Math.round((exampleOrder * valueNum) / 100) : valueNum;
  if (f.type === "PERCENT" && f.maxDiscount) exampleOff = Math.min(exampleOff, Number(f.maxDiscount));
  exampleOff = Math.min(exampleOff, exampleOrder);

  const save = async () => {
    if (!f.code) return toast.error("Enter a code or press Generate");
    if (errors.length) return toast.error(errors[0]);
    setBusy(true);
    try {
      const body = {
        ...f,
        value: valueNum,
        minOrder: Number(f.minOrder) || 0,
        maxDiscount: f.type === "PERCENT" && f.maxDiscount !== "" ? Number(f.maxDiscount) : null,
        usageLimit: f.usageLimit !== "" ? Number(f.usageLimit) : null,
        startsAt: istLocalToIso(f.startsAt),
        endsAt: istLocalToIso(f.endsAt),
      };
      const r = coupon ? await api(`/api/admin/coupons/${coupon.id}`, { method: "PATCH", body }) : await api("/api/admin/coupons", { method: "POST", body });
      toast.success(coupon ? `Saved ${r.coupon.code}` : `Created ${r.coupon.code}`);
      onSaved(r.coupon);
    } catch (e) {
      toast.error(e.status === 409 ? e.message : e.data?.issues ? Object.values(e.data.issues).flat()[0] || e.message : e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title={coupon ? `Edit ${coupon.code}` : "New coupon"}
      width={640}
      footer={
        <>
          <button className="a-btn a-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="a-btn a-btn-gold" onClick={save} disabled={busy}>
            {busy && <Spinner />} {coupon ? "Save changes" : "Create coupon"}
          </button>
        </>
      }
    >
      <form method="post"
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Code" hint="Customers type this at checkout. Letters, digits, _ and - only.">
            <input
              className="a-input font-mono uppercase tracking-[0.18em]"
              value={f.code}
              maxLength={30}
              autoFocus={!coupon}
              placeholder="WELCOME10"
              onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })}
            />
          </Field>
          <button type="button" className="a-btn sm:mb-[22px]" onClick={() => set({ code: randomCode() })}>
            <Dices /> Generate
          </button>
        </div>

        <Field label="Description" hint="Internal note — e.g. “Diwali 2026 Instagram campaign”." counter={f.description.length} max={200}>
          <input className="a-input" value={f.description} maxLength={200} onChange={(e) => set({ description: e.target.value })} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="a-label">Type</span>
            <div className="grid grid-cols-2 gap-1 rounded-[10px] border border-line bg-ink-2 p-1">
              {[
                ["PERCENT", "% Percent"],
                ["FLAT", "₹ Flat"],
              ].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set({ type: v, value: v === "PERCENT" ? Math.min(valueNum || 10, 90) : valueNum })}
                  className={cn("h-8 rounded-md text-[12.5px] font-semibold transition-colors", f.type === v ? "bg-gold text-white" : "text-mute hover:text-bone")}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <Field label={f.type === "PERCENT" ? "Percent off (1–90)" : "Amount off (₹)"}>
            <input className="a-input a-num" type="number" min={1} max={f.type === "PERCENT" ? 90 : undefined} value={f.value} onChange={(e) => set({ value: e.target.value })} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Min order (₹)" hint="0 = no minimum">
            <input className="a-input a-num" type="number" min={0} value={f.minOrder} onChange={(e) => set({ minOrder: e.target.value })} />
          </Field>
          <Field label="Max discount (₹)" hint={f.type === "PERCENT" ? "Cap for % codes" : "Only for % codes"}>
            <input className="a-input a-num" type="number" min={0} disabled={f.type !== "PERCENT"} placeholder="No cap" value={f.type === "PERCENT" ? f.maxDiscount : ""} onChange={(e) => set({ maxDiscount: e.target.value })} />
          </Field>
          <Field label="Usage limit" hint={coupon ? `Used ${coupon.usedCount}× so far` : "Empty = unlimited"}>
            <input className="a-input a-num" type="number" min={1} placeholder="∞" value={f.usageLimit} onChange={(e) => set({ usageLimit: e.target.value })} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts (IST)" hint="Empty = immediately">
            <input className="a-input a-num" type="datetime-local" value={f.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
          </Field>
          <Field label="Ends (IST)" hint="Empty = never expires">
            <input className="a-input a-num" type="datetime-local" value={f.endsAt} min={f.startsAt || undefined} onChange={(e) => set({ endsAt: e.target.value })} />
          </Field>
        </div>

        <Card bodyClass="!p-3.5" className="!rounded-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Toggle checked={f.isActive} onChange={(v) => set({ isActive: v })} label="Active" hint="Paused codes are rejected at checkout." />
            <div className="text-right text-[12px] text-mute">
              Example: on a <span className="a-num text-bone">{formatINR(exampleOrder)}</span> order →{" "}
              <span className="a-num text-gold-2">{formatINR(exampleOff)}</span> off
            </div>
          </div>
        </Card>

        {errors.length > 0 && <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[12px] text-danger">{errors.join(" · ")}</div>}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
