"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Loader2, Package } from "lucide-react";
import { trackSchema, fieldErrors, issuesToErrors } from "@/lib/validators";
import { cn } from "@/lib/utils";
import Field from "@/components/commerce/Field";
import Timeline from "@/components/commerce/Timeline";
import StatusChip from "@/components/commerce/StatusChip";
import { formatDate } from "@/components/commerce/format";

const EASE = [0.22, 1, 0.36, 1];

export default function TrackOrder({ initialOrderNumber = "" }) {
  const [form, setForm] = useState({ orderNumber: initialOrderNumber, phone: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const parsed = trackSchema.safeParse(form);
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error);
      setErrors(errs);
      document.getElementById(`track-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const qs = new URLSearchParams(parsed.data).toString();
      const res = await fetch(`/api/orders/track?${qs}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.issues) setErrors(issuesToErrors(data.issues));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-6">
      <form
        onSubmit={onSubmit}
        noValidate
        className="h-fit space-y-4 rounded-xl border border-line bg-white p-4 sm:p-5 lg:sticky lg:top-[calc(var(--header-h)+1rem)]"
      >
        <Field
          id="track-orderNumber"
          label="Order number"
          placeholder="e.g. PS2610164KQ2Z"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="[&_input]:font-mono [&_input]:uppercase [&_input]:tracking-wider"
          value={form.orderNumber}
          onChange={(e) => set("orderNumber", e.target.value.toUpperCase().replace(/\s/g, ""))}
          error={errors.orderNumber}
          hint="Find it in your confirmation message"
        />
        <Field
          id="track-phone"
          label="Mobile number used for the order"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          prefix="+91"
          maxLength={14}
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          error={errors.phone}
        />
        <p aria-live="assertive" role="alert" className={cn("rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-[13px] text-danger", !error && "hidden")}>
          {error}
        </p>
        <button type="submit" className="btn btn-gold w-full" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" strokeWidth={2} /> : <>Track order <ArrowRight className="size-4" strokeWidth={2} /></>}
        </button>
      </form>

      <div aria-live="polite" className="min-w-0">
        <AnimatePresence mode="wait">
          {result ? (
            <motion.section
              key={result.orderNumber}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              aria-label={`Order ${result.orderNumber}`}
              className="rounded-xl border border-line bg-white p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-mono text-[14px] font-semibold text-bone">{result.orderNumber}</p>
                <StatusChip status={result.status} />
              </div>
              <h2 className="mt-2 text-xl font-bold text-bone sm:text-2xl">{result.statusLabel}</h2>
              <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
                {[
                  ["Placed", formatDate(result.placedAt)],
                  ["Destination", result.city],
                  ["Items", String(result.itemCount)],
                  ["Payment", result.paymentMethod === "COD" ? "On delivery" : "Online"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-ink-2 px-3 py-3">
                    <dt className="text-[12px] text-mute">{k}</dt>
                    <dd className="mt-0.5 truncate text-[14px] font-semibold text-bone">{v}</dd>
                  </div>
                ))}
              </dl>
              {result.trackingNumber && (
                <p className="mt-4 text-[13px] text-bone-2">
                  {result.courier || "Courier"} · AWB <span className="font-mono text-bone">{result.trackingNumber}</span>
                </p>
              )}
              <div className="mt-6">
                <Timeline status={result.status} events={result.timeline} />
              </div>
            </motion.section>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-line-2 bg-ink-2 p-6 text-center"
            >
              <Package className="size-10 text-gold" strokeWidth={1.5} aria-hidden />
              <p className="mt-3 text-[16px] font-bold text-bone">Your order status will appear here</p>
              <p className="mt-1 max-w-md text-[14px] text-mute">
                Enter your order number and the mobile number you used at checkout to see where your watch is.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
