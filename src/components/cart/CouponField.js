"use client";
import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart-store";
import { formatINR, cn } from "@/lib/utils";

/** Apply / remove a coupon. Validates against /api/coupons/validate and stores it in the cart. */
export default function CouponField({ subtotal, className }) {
  const id = useId();
  const coupon = useCart((s) => s.coupon);
  const setCoupon = useCart((s) => s.setCoupon);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function apply(e) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return setError("Enter a coupon code");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c, subtotal }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "This code isn't valid");
      setCoupon(data.coupon);
      setCode("");
      setOpen(false);
      toast.success(`${data.coupon.code} applied · you save ${formatINR(data.discount)}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const short = coupon && subtotal < (coupon.minOrder || 0) ? coupon.minOrder - subtotal : 0;

  if (coupon) {
    return (
      <div className={cn("rounded-lg border border-dashed border-lume/50 bg-lume/5 px-4 py-3", className)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Tag className="size-4 shrink-0 text-lume" strokeWidth={2} />
            <div className="min-w-0">
              <p className="font-mono text-[13px] font-bold uppercase tracking-wider text-lume">{coupon.code}</p>
              <p className="truncate text-[12px] text-bone-2">
                {coupon.description || (coupon.type === "PERCENT" ? `${coupon.value}% off` : `${formatINR(coupon.value)} off`)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCoupon(null)}
            className="grid size-8 shrink-0 place-items-center rounded-full border border-line-2 bg-white text-bone-2 transition hover:border-ember hover:text-ember"
            aria-label={`Remove coupon ${coupon.code}`}
          >
            <X className="size-3.5" strokeWidth={1.5} />
          </button>
        </div>
        {short > 0 && <p className="mt-2 text-[12px] text-ember">Add {formatINR(short)} more to use this code.</p>}
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        className="group flex w-full items-center justify-between py-1 text-left"
      >
        <span className="flex items-center gap-3 text-[14px] font-medium text-bone transition">
          <Tag className="size-4 text-gold" strokeWidth={2} />
          Have a coupon code?
        </span>
        <span className="text-[13px] font-semibold text-gold-2">{open ? "Close" : "Apply"}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.form
            id={`${id}-panel`}
            onSubmit={apply}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
            noValidate
          >
            <div className="flex gap-2 pt-3">
              <label htmlFor={`${id}-code`} className="sr-only">
                Coupon code
              </label>
              <input
                id={`${id}-code`}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError("");
                }}
                placeholder="ENTER CODE"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-invalid={error ? "true" : undefined}
                aria-describedby={`${id}-err`}
                className="field h-11 min-w-0 flex-1 font-mono text-[13px] uppercase tracking-wider"
                maxLength={40}
              />
              <button type="submit" className="btn btn-ghost btn-sm h-11" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" strokeWidth={1.5} /> : "Apply"}
              </button>
            </div>
            <p id={`${id}-err`} aria-live="polite" className={cn("text-[12px] text-danger", error ? "mt-2" : "sr-only")}>
              {error}
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
