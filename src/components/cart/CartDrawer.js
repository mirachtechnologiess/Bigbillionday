"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ShieldCheck, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { computeTotals } from "@/lib/pricing";
import { formatINR } from "@/lib/utils";
import { useMounted } from "@/components/commerce/hooks";
import QtyStepper from "./QtyStepper";
import FreeShippingMeter from "./FreeShippingMeter";

const EASE = [0.22, 1, 0.36, 1];

export default function CartDrawer({ settings }) {
  const mounted = useMounted();
  const open = useCart((s) => s.open);
  const setOpen = useCart((s) => s.setOpen);
  const items = useCart((s) => s.items);
  const coupon = useCart((s) => s.coupon);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const pathname = usePathname();
  const closeRef = useRef(null);
  const lastFocus = useRef(null);

  // Close on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  // Scroll lock (native + Lenis), Escape to close, focus management
  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    window.__lenis?.stop?.();
    const t = setTimeout(() => closeRef.current?.focus(), 60);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      html.style.overflow = prev;
      window.__lenis?.start?.();
      window.removeEventListener("keydown", onKey);
      lastFocus.current?.focus?.();
    };
  }, [open, setOpen]);

  if (!mounted) return null;

  const totals = computeTotals({ items, coupon, shipping: settings?.shipping, payment: settings?.payment, method: "COD" });
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const threshold = settings?.shipping?.freeShippingAbove ?? 0;
  const close = () => setOpen(false);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]" role="presentation">
          <motion.button
            type="button"
            aria-label="Close cart"
            tabIndex={-1}
            onClick={close}
            className="absolute inset-0 cursor-default bg-bone/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-drawer-title"
            className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col bg-ink shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: EASE }}
            data-lenis-prevent
          >
            <header className="flex items-center justify-between gap-4 border-b border-line px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
              <h2 id="cart-drawer-title" className="text-lg font-bold text-bone">
                My Cart <span className="text-[14px] font-medium text-mute">({count} {count === 1 ? "item" : "items"})</span>
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="grid size-10 place-items-center rounded-full text-bone-2 transition hover:bg-ink-3 hover:text-bone"
                aria-label="Close cart"
              >
                <X className="size-5" strokeWidth={2} />
              </button>
            </header>

            {items.length === 0 ? (
              <EmptyBag onClose={close} />
            ) : (
              <>
                {threshold > 0 && (
                  <div className="border-b border-line bg-ink-2 px-4 py-3 sm:px-5">
                    <FreeShippingMeter amount={totals.subtotal - totals.discount} threshold={threshold} />
                  </div>
                )}

                <ul className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5" aria-label="Items in your cart">
                  <AnimatePresence initial={false}>
                    {items.map((it) => (
                      <motion.li
                        key={it.productId}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { duration: 0.25 } }}
                        exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
                        className="flex gap-3 border-b border-line py-4 last:border-b-0"
                      >
                        <Link
                          href={`/watches/${it.slug}`}
                          onClick={close}
                          className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-line bg-ink-2"
                        >
                          {it.image && <Image src={it.image} alt={it.name} fill sizes="80px" className="object-cover" />}
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col">
                          {it.brand && <p className="text-[12px] font-medium text-mute">{it.brand}</p>}
                          <Link
                            href={`/watches/${it.slug}`}
                            onClick={close}
                            className="line-clamp-2 text-[14px] font-semibold leading-snug text-bone hover:text-gold-2"
                          >
                            {it.name}
                          </Link>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-[15px] font-bold text-bone tabular-nums">{formatINR(it.price)}</span>
                            {it.mrp > it.price && <span className="text-[12px] text-mute line-through tabular-nums">{formatINR(it.mrp)}</span>}
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
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
                              className="text-[13px] font-medium text-mute hover:text-ember"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>

                <footer className="border-t border-line bg-ink px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-6px_16px_-12px_rgb(17_24_39/0.25)] sm:px-5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[14px] font-medium text-bone-2">Subtotal</span>
                    <span className="text-xl font-bold text-bone tabular-nums">{formatINR(totals.subtotal - totals.discount)}</span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-mute">
                    {totals.discount > 0 && <>Includes {coupon?.code} · </>}Shipping calculated at checkout
                  </p>
                  <div className="mt-3 grid grid-cols-[1fr_1.4fr] gap-2">
                    <Link href="/cart" onClick={close} className="btn btn-ghost btn-sm h-11">
                      View cart
                    </Link>
                    <Link href="/checkout" onClick={close} className="btn btn-gold btn-sm h-11">
                      Checkout <ArrowRight className="size-4" strokeWidth={2} />
                    </Link>
                  </div>
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-bone-2">
                    <ShieldCheck className="size-4 text-lume" strokeWidth={2} />
                    Cash on Delivery available · pay when it arrives
                  </p>
                </footer>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

function EmptyBag({ onClose }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
      <span className="grid size-20 place-items-center rounded-full bg-gold-3 text-gold-2" aria-hidden>
        <ShoppingBag className="size-9" strokeWidth={1.75} />
      </span>
      <p className="mt-5 text-lg font-bold text-bone">Your cart is empty</p>
      <p className="mt-1 max-w-xs text-[14px] text-bone-2">Add watches to your cart and they will show up here.</p>
      <Link href="/watches" onClick={onClose} className="btn btn-gold mt-6">
        Shop watches <ArrowRight className="size-4" strokeWidth={2} />
      </Link>
    </div>
  );
}
