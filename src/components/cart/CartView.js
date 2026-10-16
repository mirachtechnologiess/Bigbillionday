"use client";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Banknote, PackageCheck, RotateCcw, ShoppingBag, Truck } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { computeTotals } from "@/lib/pricing";
import { formatINR, discountPct } from "@/lib/utils";
import { useMounted } from "@/components/commerce/hooks";
import QtyStepper from "./QtyStepper";
import PriceRows from "./PriceRows";
import CouponField from "./CouponField";
import FreeShippingMeter from "./FreeShippingMeter";

export default function CartView({ settings }) {
  const mounted = useMounted();
  const items = useCart((s) => s.items);
  const coupon = useCart((s) => s.coupon);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);

  if (!mounted) {
    return (
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-80 rounded-xl" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="mt-5 flex flex-col items-center gap-3 rounded-xl border border-line bg-white px-5 py-12 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-gold-3 text-gold-2" aria-hidden>
          <ShoppingBag className="size-9" strokeWidth={1.75} />
        </span>
        <p className="mt-2 text-xl font-bold text-bone">Your cart is empty</p>
        <p className="max-w-md text-[14px] text-bone-2">
          Browse automatic, chronograph and dress watches. Every order can be paid in cash on delivery.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link href="/watches" className="btn btn-gold">
            Shop watches <ArrowRight className="size-4" strokeWidth={2} />
          </Link>
          <Link href="/wishlist" className="btn btn-ghost">
            View wishlist
          </Link>
        </div>
      </div>
    );
  }

  const totals = computeTotals({ items, coupon, shipping: settings.shipping, payment: settings.payment, method: "COD" });
  const count = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <>
      <div className="mt-5 grid gap-5 pb-24 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6 lg:pb-0">
        <section aria-label="Items in your cart" className="min-w-0 space-y-4">
          <div className="rounded-xl border border-line bg-white">
            <p className="border-b border-line px-4 py-3 text-[15px] font-bold text-bone sm:px-5">
              {count} {count === 1 ? "item" : "items"} in your cart
            </p>
            <ul>
              <AnimatePresence initial={false}>
                {items.map((it) => {
                  const off = discountPct(it.price, it.mrp);
                  return (
                    <motion.li
                      key={it.productId}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { duration: 0.25 } }}
                      exit={{ opacity: 0, height: 0, transition: { duration: 0.25 } }}
                      className="flex gap-3 border-b border-line px-4 py-4 last:border-b-0 sm:gap-4 sm:px-5"
                    >
                      <Link
                        href={`/watches/${it.slug}`}
                        className="relative size-24 shrink-0 overflow-hidden rounded-lg border border-line bg-ink-2 sm:size-28"
                      >
                        {it.image && <Image src={it.image} alt={it.name} fill sizes="112px" className="object-cover" />}
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:gap-4">
                        <div className="min-w-0 flex-1">
                          {it.brand && <p className="text-[12px] font-medium text-mute">{it.brand}</p>}
                          <Link
                            href={`/watches/${it.slug}`}
                            className="line-clamp-2 text-[15px] font-semibold leading-snug text-bone hover:text-gold-2"
                          >
                            {it.name}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                            <span className="text-[16px] font-bold text-bone tabular-nums">{formatINR(it.price)}</span>
                            {off > 0 && (
                              <>
                                <span className="text-[13px] text-mute line-through tabular-nums">{formatINR(it.mrp)}</span>
                                <span className="text-[13px] font-semibold text-lume">{off}% off</span>
                              </>
                            )}
                          </div>
                          {it.stock > 0 && it.stock <= 3 && (
                            <p className="mt-1 text-[12px] font-semibold text-ember">Only {it.stock} left</p>
                          )}
                          <div className="mt-3 flex items-center gap-4">
                            <QtyStepper
                              size="sm"
                              value={it.quantity}
                              max={it.stock}
                              onChange={(q) => setQty(it.productId, q)}
                              label={`Quantity of ${it.name}`}
                            />
                            <button
                              type="button"
                              onClick={() => remove(it.productId)}
                              className="text-[13px] font-semibold text-bone-2 hover:text-ember"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <p className="hidden text-right text-[16px] font-bold text-bone tabular-nums sm:block">
                          {formatINR(it.price * it.quantity)}
                        </p>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Banknote, t: "Cash on Delivery", d: "Pay in cash or UPI at your door" },
              { icon: PackageCheck, t: "Quality checked", d: "Inspected before dispatch" },
              { icon: RotateCcw, t: "Easy 7-day returns", d: "Unused, with original tags" },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="flex items-start gap-3 rounded-xl border border-line bg-white px-4 py-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-gold" strokeWidth={1.75} />
                <div>
                  <p className="text-[14px] font-semibold text-bone">{t}</p>
                  <p className="text-[12px] text-mute">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start" aria-label="Order summary">
          <div className="rounded-xl border border-line bg-white p-4 sm:p-5">
            <h2 className="text-lg font-bold text-bone">Price details</h2>
            <div className="mt-4">
              <FreeShippingMeter amount={totals.subtotal - totals.discount} threshold={settings.shipping.freeShippingAbove} />
            </div>
            <div className="my-4 h-px bg-line" />
            <CouponField subtotal={totals.subtotal} />
            <div className="my-4 h-px bg-line" />
            <PriceRows totals={totals} itemCount={count} coupon={coupon} />
            <Link href="/checkout" className="btn btn-gold mt-5 hidden w-full lg:flex">
              Proceed to checkout <ArrowRight className="size-4" strokeWidth={2} />
            </Link>
            <p className="mt-3 flex items-center justify-center gap-2 text-center text-[12px] text-mute">
              <Truck className="size-4 text-lume" strokeWidth={2} />
              Delivered in {settings.shipping.etaDays} business days
            </p>
          </div>
        </aside>
      </div>

      {/* Mobile sticky checkout bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-6px_16px_-12px_rgb(17_24_39/0.3)] lg:hidden">
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <p className="text-[12px] text-mute">Total</p>
            <p className="text-xl font-bold leading-none text-bone tabular-nums">{formatINR(totals.total)}</p>
          </div>
          <Link href="/checkout" className="btn btn-gold flex-1">
            Checkout <ArrowRight className="size-4" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </>
  );
}
