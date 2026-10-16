"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, Gift, Minus, PackageCheck, Plus, RotateCcw, ShieldCheck, ShoppingCart, Star, Zap } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { cn, discountPct, formatINR } from "@/lib/utils";
import PincodeChecker from "./PincodeChecker";
import WishButton from "./WishButton";

const TRUST = [
  [Banknote, "Cash on Delivery", "text-lume"],
  [RotateCcw, "Easy 7-day returns", "text-gold"],
  [PackageCheck, "Quality checked", "text-teal"],
  [ShieldCheck, "Secure packaging", "text-ember"],
];

/**
 * Right-hand purchase column on the product page (+ sticky mobile buy bar).
 * product: { id, slug, name, brand:{name,slug}, price, mrp, stock, lowStockAt, codAvailable, ratingAvg, ratingCount, modelNumber, shortDescription, image, offer? }
 */
export default function BuyPanel({ product, shipping = {}, codEnabled = true }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const setOpen = useCart((s) => s.setOpen);
  const [qty, setQty] = useState(1);
  const [showBar, setShowBar] = useState(false);
  const ctaRef = useRef(null);
  const stock = product.stock ?? 0;
  const soldOut = stock <= 0;
  const low = !soldOut && stock <= (product.lowStockAt || 3);
  const off = discountPct(product.price, product.mrp);
  const maxQty = Math.max(1, Math.min(stock, 5));
  const freeShip = shipping.freeShippingAbove && product.price >= shipping.freeShippingAbove;
  const canBuyNow = codEnabled && product.codAvailable !== false;
  const rating = Number(product.ratingAvg) || 0;

  // show the mobile sticky bar once the main buttons scroll out of view
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const item = {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand?.name || "",
    image: product.image || null,
    price: product.price,
    mrp: product.mrp,
    stock,
  };

  const addToCart = () => !soldOut && add(item, qty);
  const buyNow = () => {
    if (soldOut) return;
    add(item, qty);
    setOpen(false);
    router.push("/checkout");
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {product.brand && (
            <Link href={`/brands/${product.brand.slug}`} className="text-[13px] font-bold text-teal hover:underline">
              Visit the {product.brand.name} store
            </Link>
          )}
          <h1 className="mt-1 text-[19px] font-bold leading-snug text-bone sm:text-[24px]">{product.name}</h1>
        </div>
        <WishButton productId={product.id} name={product.name} className="h-10 w-10 shrink-0" size={18} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-mute">
        {product.ratingCount > 0 ? (
          <a href="#reviews" className="flex items-center gap-2 hover:text-gold-2">
            <span className="inline-flex items-center gap-0.5 rounded bg-lume px-1.5 py-0.5 text-[12px] font-bold text-white">
              {rating.toFixed(1)} <Star size={11} className="fill-current" aria-hidden />
            </span>
            <span className="font-semibold">
              {product.ratingCount.toLocaleString("en-IN")} rating{product.ratingCount > 1 ? "s" : ""}
            </span>
          </a>
        ) : (
          <a href="#reviews" className="font-semibold text-teal hover:underline">
            Be the first to review
          </a>
        )}
        {product.modelNumber && <span>Model: {product.modelNumber}</span>}
      </div>

      {/* price */}
      <div className="mt-4 border-t border-line pt-4">
        {off > 0 && <p className="text-[13px] font-bold text-lume">Special price</p>}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[30px] font-extrabold leading-none tracking-tight text-bone sm:text-[34px]">{formatINR(product.price)}</span>
          {off > 0 && (
            <>
              <span className="text-[15px] text-mute">
                M.R.P.: <span className="line-through">{formatINR(product.mrp)}</span>
              </span>
              <span className="text-[17px] font-extrabold text-lume">{off}% off</span>
            </>
          )}
        </div>
        <p className="mt-1.5 text-[12.5px] text-bone-2">
          Inclusive of all taxes
          {off > 0 && (
            <>
              {" · "}
              <span className="font-semibold text-lume">You save {formatINR(product.mrp - product.price)}</span>
            </>
          )}
        </p>
      </div>

      {product.offer && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-lume/25 bg-[#ecf8f2] px-3 py-2.5">
          <span className="inline-flex shrink-0 items-center gap-1 rounded bg-lume px-1.5 py-0.5 text-[11px] font-bold uppercase text-white">
            <Gift size={12} aria-hidden /> Offer
          </span>
          <p className="text-[13.5px] font-semibold text-forest">{product.offer}</p>
        </div>
      )}

      {/* stock + delivery */}
      <div className="mt-4 space-y-3 rounded-xl border border-line bg-white p-3.5 sm:p-4">
        <p className={cn("text-[14px] font-bold", soldOut ? "text-ember" : low ? "text-ember" : "text-lume")}>
          {soldOut ? "Currently out of stock" : low ? `Hurry, only ${stock} left in stock` : "In stock"}
        </p>
        <ul className="space-y-1 text-[13px] text-bone-2">
          <li>
            {freeShip ? (
              <span className="font-semibold text-bone">FREE delivery</span>
            ) : shipping.flatFee ? (
              <>
                Delivery fee <span className="font-semibold text-bone">{formatINR(shipping.flatFee)}</span>
                {shipping.freeShippingAbove ? <> &middot; free above {formatINR(shipping.freeShippingAbove)}</> : null}
              </>
            ) : (
              <span className="font-semibold text-bone">FREE delivery</span>
            )}
            {shipping.etaDays ? <> &middot; usually in {shipping.etaDays} days</> : null}
          </li>
          {canBuyNow && <li>Cash on Delivery available</li>}
        </ul>
        <div>
          <p className="mb-1.5 text-[12.5px] font-semibold text-bone">Check delivery to your pincode</p>
          <PincodeChecker />
        </div>
      </div>

      {/* quantity + buttons */}
      <div ref={ctaRef} className="mt-4">
        {!soldOut && (
          <div className="mb-3 flex items-center gap-3">
            <span className="text-[13.5px] font-semibold text-bone">Quantity</span>
            <div className="flex h-9 items-center rounded-lg border border-line-2 bg-white" role="group" aria-label="Quantity">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
                className="grid h-full w-9 place-items-center text-bone-2 hover:text-gold-2 disabled:opacity-30"
              >
                <Minus size={15} />
              </button>
              <span className="w-7 text-center text-[14px] font-bold" aria-live="polite">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={qty >= maxQty}
                aria-label="Increase quantity"
                className="grid h-full w-9 place-items-center text-bone-2 hover:text-gold-2 disabled:opacity-30"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
        )}
        <div className={cn("grid gap-3", canBuyNow ? "grid-cols-2" : "grid-cols-1")}>
          <button type="button" onClick={addToCart} disabled={soldOut} className="btn btn-sun h-12 rounded-lg px-3 text-[14px] uppercase sm:text-[15px]">
            <ShoppingCart size={18} strokeWidth={2.2} aria-hidden />
            {soldOut ? "Sold out" : "Add to cart"}
          </button>
          {canBuyNow && (
            <button type="button" onClick={buyNow} disabled={soldOut} className="btn btn-gold h-12 flex-col gap-0 rounded-lg px-3 leading-tight">
              <span className="flex items-center gap-1.5 text-[14px] uppercase sm:text-[15px]">
                <Zap size={17} strokeWidth={2.2} className="fill-current" aria-hidden /> Buy now
              </span>
              <span className="text-[10.5px] font-semibold opacity-90">Cash on Delivery</span>
            </button>
          )}
        </div>
        <p className="mt-2 text-center text-[12px] text-mute">Online payment (UPI / cards) coming soon</p>
      </div>

      <ul className="mt-4 grid grid-cols-4 gap-1 rounded-xl border border-line bg-white px-1 py-3">
        {TRUST.map(([Icon, label, tone]) => (
          <li key={label} className="flex flex-col items-center gap-1.5 px-1 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-ink-2">
              <Icon size={19} className={tone} aria-hidden />
            </span>
            <span className="text-[11px] font-semibold leading-tight text-bone-2">{label}</span>
          </li>
        ))}
      </ul>

      {product.shortDescription && <p className="mt-4 text-[14px] leading-relaxed text-bone-2">{product.shortDescription}</p>}

      {/* mobile sticky buy bar */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 grid border-t border-line bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-6px_20px_-10px_rgba(17,24,39,0.3)] transition-transform duration-300 lg:hidden",
          canBuyNow ? "grid-cols-2 gap-2" : "grid-cols-1",
          showBar ? "translate-y-0" : "translate-y-full"
        )}
        aria-hidden={!showBar}
      >
        <button type="button" onClick={addToCart} disabled={soldOut} tabIndex={showBar ? 0 : -1} className="btn btn-sun h-11 rounded-lg px-2 text-[13.5px] uppercase">
          {soldOut ? "Sold out" : "Add to cart"}
        </button>
        {canBuyNow && (
          <button type="button" onClick={buyNow} disabled={soldOut} tabIndex={showBar ? 0 : -1} className="btn btn-gold h-11 rounded-lg px-2 text-[13.5px] uppercase">
            Buy now &middot; {formatINR(product.price)}
          </button>
        )}
      </div>
    </div>
  );
}
