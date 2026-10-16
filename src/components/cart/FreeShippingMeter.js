"use client";
import { motion } from "framer-motion";
import { Truck } from "lucide-react";
import { formatINR } from "@/lib/utils";

/** Green progress bar toward free shipping. */
export default function FreeShippingMeter({ amount, threshold }) {
  if (!threshold) return null;
  const pct = Math.max(0, Math.min(1, amount / threshold));
  const left = Math.max(0, threshold - amount);
  return (
    <div>
      <p className="flex items-center gap-2 text-[13px] text-bone-2" aria-live="polite">
        <Truck className="size-4 shrink-0 text-lume" strokeWidth={2} aria-hidden />
        {left > 0 ? (
          <span>
            Add <span className="font-bold text-bone">{formatINR(left)}</span> more for{" "}
            <span className="font-semibold text-lume">FREE shipping</span>
          </span>
        ) : (
          <span className="font-semibold text-lume">You get FREE shipping on this order</span>
        )}
      </p>
      <div
        className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-4"
        role="progressbar"
        aria-label="Progress to free shipping"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct * 100)}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-lume"
          initial={false}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
