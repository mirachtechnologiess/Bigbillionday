"use client";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function QtyStepper({ value, max = 10, onChange, label = "Quantity", size = "md" }) {
  const cap = Math.max(1, Math.min(10, max || 10));
  const btn =
    "grid h-full place-items-center text-bone transition-colors hover:bg-ink-3 hover:text-gold-2 disabled:pointer-events-none disabled:opacity-30";
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex items-stretch overflow-hidden rounded-lg border border-line-2 bg-white",
        size === "sm" ? "h-9" : "h-10"
      )}
    >
      <button type="button" className={cn(btn, "w-9")} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease quantity">
        <Minus className="size-3.5" strokeWidth={2.25} />
      </button>
      <output aria-live="polite" className="grid min-w-8 place-items-center border-x border-line text-[14px] font-semibold tabular-nums text-bone">
        {value}
      </output>
      <button type="button" className={cn(btn, "w-9")} onClick={() => onChange(value + 1)} disabled={value >= cap} aria-label="Increase quantity">
        <Plus className="size-3.5" strokeWidth={2.25} />
      </button>
    </div>
  );
}
