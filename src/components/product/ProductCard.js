"use client";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Star } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { cn, discountPct, formatINR } from "@/lib/utils";
import WishButton from "./WishButton";

/** Matches the default store setting shipping.freeShippingAbove. */
const FREE_DELIVERY_ABOVE = 999;
export const CARD_SIZES = "(min-width: 1280px) 17vw, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw";

/**
 * Compact retail product card. `product` follows catalog.cardSelect:
 * { id, name, slug, price, mrp, stock, isNewArrival, isBestSeller, ratingAvg, ratingCount, movement, caseSize, brand:{name,slug}, images:[{url,alt,blurData}] }
 * `sizes` can be overridden (e.g. by ProductRail).
 */
export default function ProductCard({ product, priority = false, index = 0, sizes = CARD_SIZES }) {
  const add = useCart((s) => s.add);
  if (!product) return null;
  const [img1, img2] = product.images || [];
  const off = discountPct(product.price, product.mrp);
  const stock = product.stock ?? 0;
  const soldOut = stock <= 0;
  const low = !soldOut && stock <= 3;
  const href = `/watches/${product.slug}`;
  const brand = product.brand?.name || "";
  const rating = Number(product.ratingAvg) || 0;

  const addToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) return;
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand,
      image: img1?.url || null,
      price: product.price,
      mrp: product.mrp,
      stock,
    });
  };

  return (
    <article
      data-index={index}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-14px_rgba(17,24,39,0.35)]"
    >
      <Link href={href} className="flex flex-1 flex-col" aria-label={`${brand} ${product.name}`}>
        <div className="relative aspect-square overflow-hidden bg-[#f6f7f9]">
          {img1 ? (
            <Image
              src={img1.url}
              alt={img1.alt || `${brand} ${product.name}`}
              fill
              sizes={sizes}
              priority={priority}
              placeholder={img1.blurData ? "blur" : "empty"}
              blurDataURL={img1.blurData || undefined}
              className={cn(
                "object-cover transition-[opacity,transform] duration-500 group-hover:scale-[1.03]",
                img2 && "[@media(hover:hover)]:group-hover:opacity-0",
                soldOut && "opacity-60 grayscale"
              )}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-[12px] text-mute">No image</div>
          )}
          {img2 && (
            <Image
              src={img2.url}
              alt=""
              aria-hidden
              fill
              sizes={sizes}
              loading="lazy"
              className="hidden object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 [@media(hover:hover)]:block"
            />
          )}

          <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
            {soldOut ? (
              <span className="rounded bg-bone px-1.5 py-0.5 text-[10.5px] font-bold text-white">Sold out</span>
            ) : (
              <>
                {off > 0 && <span className="rounded bg-ember px-1.5 py-0.5 text-[10.5px] font-bold leading-tight text-white">{off}% OFF</span>}
                {product.isBestSeller ? (
                  <span className="rounded bg-sun px-1.5 py-0.5 text-[10px] font-bold leading-tight text-bone">Bestseller</span>
                ) : product.isNewArrival ? (
                  <span className="rounded bg-teal px-1.5 py-0.5 text-[10px] font-bold leading-tight text-white">New</span>
                ) : null}
              </>
            )}
          </div>
          {low && (
            <span className="absolute bottom-2 left-2 rounded bg-white/95 px-1.5 py-0.5 text-[10.5px] font-semibold text-ember shadow-sm">
              Only {stock} left
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col px-2.5 pb-2 pt-2 sm:px-3">
          {brand && <p className="truncate text-[10.5px] font-semibold uppercase tracking-wide text-mute">{brand}</p>}
          <h3 className="mt-0.5 line-clamp-2 min-h-[2.5em] text-[13px] font-semibold leading-[1.25] text-bone group-hover:text-gold-2 sm:text-[14px]">
            {product.name}
          </h3>
          {product.ratingCount > 0 && (
            <p className="mt-1.5 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-0.5 rounded bg-lume px-1.5 py-[1px] text-[11px] font-bold text-white">
                {rating.toFixed(1)}
                <Star size={10} className="fill-current" aria-hidden />
              </span>
              <span className="text-[11.5px] text-mute">({product.ratingCount.toLocaleString("en-IN")})</span>
              <span className="sr-only">
                Rated {rating.toFixed(1)} out of 5 from {product.ratingCount} reviews
              </span>
            </p>
          )}
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-[15px] font-extrabold text-bone sm:text-[16px]">{formatINR(product.price)}</span>
            {off > 0 && (
              <>
                <span className="text-[11.5px] text-mute line-through">{formatINR(product.mrp)}</span>
                <span className="text-[12px] font-bold text-lume">{off}% off</span>
              </>
            )}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-bone-2">
            {product.price >= FREE_DELIVERY_ABOVE ? (
              <>
                Free delivery <span className="text-mute">·</span> <span className="text-lume">COD</span>
              </>
            ) : (
              <span className="text-lume">Cash on Delivery</span>
            )}
          </p>
        </div>
      </Link>

      <div className="px-2.5 pb-2.5 sm:px-3 sm:pb-3">
        <button
          type="button"
          onClick={addToCart}
          disabled={soldOut}
          aria-label={soldOut ? `${product.name} is sold out` : `Add ${product.name} to cart`}
          className={cn(
            "flex h-8 w-full items-center justify-center gap-1.5 rounded-md text-[12.5px] font-bold transition-colors",
            soldOut ? "cursor-not-allowed bg-ink-3 text-mute" : "bg-sun text-bone hover:bg-[#ffb000]"
          )}
        >
          {!soldOut && <ShoppingCart size={14} strokeWidth={2.2} aria-hidden />}
          {soldOut ? "Sold out" : "Add to cart"}
        </button>
      </div>

      <WishButton productId={product.id} name={product.name} className="absolute right-2 top-2 h-8 w-8" size={15} />
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="skeleton aspect-square" />
      <div className="space-y-2 p-3">
        <div className="skeleton h-2.5 w-14 rounded" />
        <div className="skeleton h-3 w-11/12 rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
        <div className="skeleton h-4 w-20 rounded" />
        <div className="skeleton mt-2 h-8 w-full rounded-md" />
      </div>
    </div>
  );
}
