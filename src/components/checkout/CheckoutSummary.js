"use client";
import Image from "next/image";
import { PackageCheck } from "lucide-react";
import { formatINR } from "@/lib/utils";
import PriceRows from "@/components/cart/PriceRows";
import CouponField from "@/components/cart/CouponField";

/** Order summary used in the checkout aside (desktop) and the collapsible panel (mobile). */
export default function CheckoutSummary({ items, totals, coupon, count }) {
  return (
    <div>
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.productId} className="flex items-center gap-3">
            <div className="relative size-16 shrink-0">
              <div className="relative size-16 overflow-hidden rounded-lg border border-line bg-ink-2">
                {it.image && <Image src={it.image} alt="" fill sizes="64px" className="object-cover" />}
              </div>
              <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-gold text-[11px] font-bold text-white">
                {it.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              {it.brand && <p className="text-[12px] text-mute">{it.brand}</p>}
              <p className="line-clamp-2 text-[14px] font-medium leading-snug text-bone">{it.name}</p>
            </div>
            <p className="shrink-0 text-[14px] font-semibold text-bone tabular-nums">{formatINR(it.price * it.quantity)}</p>
          </li>
        ))}
      </ul>
      <div className="my-4 h-px bg-line" />
      <CouponField subtotal={totals.subtotal} />
      <div className="my-4 h-px bg-line" />
      <PriceRows totals={totals} itemCount={count} coupon={coupon} totalLabel="To pay" />
      <p className="mt-4 flex items-center justify-center gap-2 text-[12px] text-mute">
        <PackageCheck className="size-4 text-lume" strokeWidth={2} />
        Quality checked before dispatch · secure packaging
      </p>
    </div>
  );
}
