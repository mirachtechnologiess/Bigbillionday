"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, PlugZap, RefreshCw, Save, Truck, Unplug, Webhook } from "lucide-react";
import { api } from "@/components/admin/fetcher";
import { ConfirmButton, CopyButton, Field, Pill, Spinner, Toggle, fmtDate } from "@/components/admin/ui";
import { cn, formatINR } from "@/lib/utils";

/**
 * Settings → Shipping: connect the Shiprocket API user, choose the pickup address and package defaults,
 * and copy the tracking-webhook details into Shiprocket.
 */
export default function ShiprocketCard({ isAdmin }) {
  const [st, setSt] = useState(null);
  const [cred, setCred] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [editCred, setEditCred] = useState(false);
  const [cfg, setCfg] = useState(null);
  const [busy, setBusy] = useState("");

  const apply = (r) => {
    setSt((prev) => ({ ...r, pickups: r.pickups?.length ? r.pickups : prev?.pickups || [], wallet: r.wallet ?? prev?.wallet ?? null }));
    setCfg(r.config);
  };
  const load = () =>
    api("/api/admin/integrations/shiprocket")
      .then(apply)
      .catch((e) => toast.error(e.message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function call(name, method, body, success) {
    setBusy(name);
    try {
      const r = await api("/api/admin/integrations/shiprocket", { method, body });
      apply(r);
      if (success) toast.success(success);
      return r;
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy("");
    }
  }

  async function connect(e) {
    e.preventDefault();
    const r = await call("connect", "PUT", cred, "Shiprocket connected");
    if (r) {
      setCred({ email: "", password: "" });
      setEditCred(false);
      // first connection: preselect the primary pickup address
      const primary = r.pickups?.find((p) => p.primary) || r.pickups?.[0];
      if (primary && !r.config.pickupLocation) await call("pickup", "PATCH", { pickupLocation: primary.name, pickupPincode: primary.pincode });
    }
  }

  const choosePickup = (name) => {
    const p = st.pickups.find((x) => x.name === name);
    if (p) call("pickup", "PATCH", { pickupLocation: p.name, pickupPincode: p.pincode }, `Pickup address: ${p.name}`);
  };

  const saveDefaults = () =>
    call("defaults", "PATCH", {
      weightKg: cfg.weightKg, lengthCm: cfg.lengthCm, breadthCm: cfg.breadthCm, heightCm: cfg.heightCm,
      autoPickup: cfg.autoPickup, autoStatus: cfg.autoStatus,
    }, "Shipping defaults saved");

  if (!st || !cfg) return <div className="mx-4 mt-4 flex items-center gap-2 text-[12.5px] text-mute"><Spinner /> Loading Shiprocket…</div>;

  const ok = st.connected;
  const set = (k) => (e) => setCfg((c) => ({ ...c, [k]: e.target.value }));

  return (
    <div className={cn("mx-4 mt-4 space-y-4 rounded-xl border p-4", ok ? "border-lume/25 bg-lume/[.04]" : "border-gold/30 bg-gold/[.04]")}>
      <div className="flex flex-wrap items-center gap-2">
        <Truck className={cn("h-4 w-4", ok ? "text-lume" : "text-gold")} />
        <span className="text-[13px] font-semibold">Shiprocket</span>
        <Pill tone={ok ? "lume" : st.account?.unreadable ? "danger" : "gold"}>
          {ok ? "Connected" : st.account?.unreadable ? "Re-enter credentials" : "Not connected"}
        </Pill>
        {st.wallet != null && <Pill tone={st.wallet < 0 ? "danger" : "mute"} dot={false}>Wallet {formatINR(Math.round(st.wallet))}</Pill>}
      </div>
      {st.error && <p className="text-[12px] text-danger">{st.error}</p>}

      {/* 1. API user */}
      <section>
        <h3 className="a-label">1 · API user</h3>
        {ok && !editCred ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
            <span>
              <span className="font-medium">{st.account.email}</span>
              <span className="text-mute"> · saved {fmtDate(st.account.updatedAt, true)}{st.account.updatedBy ? ` by ${st.account.updatedBy}` : ""}</span>
            </span>
            {isAdmin && (
              <span className="flex gap-1.5">
                <button type="button" className="a-btn a-btn-sm a-btn-ghost" onClick={() => setEditCred(true)}>Change</button>
                <ConfirmButton
                  className="a-btn a-btn-sm a-btn-ghost text-danger"
                  title="Disconnect Shiprocket?"
                  message="New shipments can't be booked until you connect again. Existing shipments and their tracking stay on the orders."
                  confirmLabel="Disconnect"
                  onConfirm={() => call("disconnect", "DELETE", undefined, "Disconnected")}
                >
                  <Unplug /> Disconnect
                </ConfirmButton>
              </span>
            )}
          </div>
        ) : isAdmin ? (
          <form method="post" onSubmit={connect} className="space-y-2">
            <p className="text-[12px] text-mute">
              In Shiprocket open <b>Settings → API → API Users → Add New API User</b>. Use an email that is <b>different</b> from your Shiprocket login, set a password, then enter both here. They are checked with Shiprocket and stored encrypted.
            </p>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input className="a-input" type="email" placeholder="API user email" autoComplete="off" value={cred.email} onChange={(e) => setCred((c) => ({ ...c, email: e.target.value }))} required />
              <div className="relative">
                <input className="a-input w-full pr-10" type={show ? "text" : "password"} placeholder="API user password" autoComplete="new-password" value={cred.password} onChange={(e) => setCred((c) => ({ ...c, password: e.target.value }))} required />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-mute hover:text-bone" aria-label={show ? "Hide password" : "Show password"}>
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex gap-1.5">
                <button className="a-btn a-btn-gold whitespace-nowrap" disabled={!!busy}>
                  {busy === "connect" ? <Spinner /> : <PlugZap />} Verify &amp; connect
                </button>
                {editCred && <button type="button" className="a-btn a-btn-ghost" onClick={() => setEditCred(false)}>Cancel</button>}
              </div>
            </div>
          </form>
        ) : (
          <p className="text-[12px] text-mute">Only an ADMIN can connect Shiprocket.</p>
        )}
      </section>

      {ok && (
        <>
          {/* 2. Pickup address */}
          <section>
            <h3 className="a-label">2 · Pickup address</h3>
            {st.pickups.length ? (
              <select className="a-input" value={cfg.pickupLocation} disabled={!isAdmin || !!busy} onChange={(e) => choosePickup(e.target.value)}>
                {!cfg.pickupLocation && <option value="">Choose the address the courier collects from…</option>}
                {st.pickups.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}{p.primary ? " (primary)" : ""} — {p.address} — {p.pincode}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[12px] text-mute">
                {cfg.pickupLocation ? `${cfg.pickupLocation} · ${cfg.pickupPincode}` : "No pickup addresses found — add one in Shiprocket → Settings → Pickup Addresses."}
              </p>
            )}
          </section>

          {/* 3. Defaults */}
          <section>
            <h3 className="a-label">3 · Default package (editable per order)</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Field label="Weight (kg)"><input className="a-input a-num" inputMode="decimal" value={cfg.weightKg} onChange={set("weightKg")} disabled={!isAdmin} /></Field>
              <Field label="Length (cm)"><input className="a-input a-num" inputMode="numeric" value={cfg.lengthCm} onChange={set("lengthCm")} disabled={!isAdmin} /></Field>
              <Field label="Breadth (cm)"><input className="a-input a-num" inputMode="numeric" value={cfg.breadthCm} onChange={set("breadthCm")} disabled={!isAdmin} /></Field>
              <Field label="Height (cm)"><input className="a-input a-num" inputMode="numeric" value={cfg.heightCm} onChange={set("heightCm")} disabled={!isAdmin} /></Field>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Toggle checked={cfg.autoPickup} onChange={(v) => setCfg((c) => ({ ...c, autoPickup: v }))} disabled={!isAdmin} label="Request pickup automatically" hint="Right after the AWB is assigned." />
              <Toggle checked={cfg.autoStatus} onChange={(v) => setCfg((c) => ({ ...c, autoStatus: v }))} disabled={!isAdmin} label="Update order status from tracking" hint="Shipped → Out for delivery → Delivered (COD marked collected)." />
            </div>
            {isAdmin && (
              <div className="mt-3 flex justify-end">
                <button type="button" className="a-btn a-btn-sm a-btn-gold" onClick={saveDefaults} disabled={!!busy}>
                  {busy === "defaults" ? <Spinner /> : <Save />} Save defaults
                </button>
              </div>
            )}
          </section>

          {/* 4. Webhook */}
          {isAdmin && st.webhook.token && (
            <section>
              <h3 className="a-label flex items-center gap-1.5"><Webhook className="h-3.5 w-3.5" /> 4 · Live tracking webhook</h3>
              <p className="mb-2 text-[12px] text-mute">
                In Shiprocket open <b>Settings → API → Webhooks</b>, paste the URL and the token below, and switch it on. Status changes then reach this panel within seconds (a sync also runs every 30 minutes).
              </p>
              <div className="space-y-1.5 text-[12.5px]">
                <div className="flex items-center gap-2">
                  <span className="w-14 text-mute">URL</span>
                  <code className="min-w-0 flex-1 truncate rounded bg-ink-3 px-2 py-1">{st.webhook.url}</code>
                  <CopyButton text={st.webhook.url} label="Copy" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-14 text-mute">Token</span>
                  <code className="min-w-0 flex-1 truncate rounded bg-ink-3 px-2 py-1">{st.webhook.token}</code>
                  <CopyButton text={st.webhook.token} label="Copy" />
                  <ConfirmButton
                    className="a-btn a-btn-sm a-btn-ghost"
                    title="Create a new webhook token?"
                    message="The old token stops working immediately — paste the new one into Shiprocket's webhook settings."
                    confirmLabel="Create new token"
                    danger={false}
                    onConfirm={() => call("rotate", "POST", { action: "rotate-webhook" }, "New token created")}
                    ariaLabel="New token"
                  >
                    <RefreshCw />
                  </ConfirmButton>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
