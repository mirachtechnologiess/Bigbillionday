"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import { useWishlist } from "@/lib/cart-store";
import ProductCard from "@/components/product/ProductCard";
import { useMounted } from "@/components/commerce/hooks";

export default function WishlistView({ signedIn }) {
  const mounted = useMounted();
  const ids = useWishlist((s) => s.ids);
  const setAll = useWishlist((s) => s.setAll);
  const [products, setProducts] = useState(null);

  // Fetch once on mount (account list when signed in, local ids for guests)
  useEffect(() => {
    if (!mounted) return;
    let alive = true;
    const local = useWishlist.getState().ids;
    const url = signedIn ? "/api/wishlist" : `/api/wishlist?ids=${local.join(",")}`;
    if (!signedIn && !local.length) {
      setProducts([]);
      return;
    }
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        if (signedIn && Array.isArray(data.ids)) setAll(data.ids);
        setProducts(data.products || []);
      })
      .catch(() => alive && setProducts([]));
    return () => {
      alive = false;
    };
  }, [mounted, signedIn, setAll]);

  // Hide items the visitor un-hearts while on the page
  const visible = useMemo(() => (products || []).filter((p) => ids.includes(p.id)), [products, ids]);

  if (!mounted || products === null) {
    return (
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[3/4] rounded-xl" />
        ))}
      </div>
    );
  }

  if (!visible.length) {
    return (
      <div className="mt-5 flex flex-col items-center rounded-xl border border-line bg-white px-5 py-12 text-center">
        <span className="grid size-20 place-items-center rounded-full bg-gold-3 text-gold-2" aria-hidden>
          <Heart className="size-9" strokeWidth={1.75} />
        </span>
        <p className="mt-4 text-xl font-bold text-bone">Your wishlist is empty</p>
        <p className="mt-1 max-w-md text-[14px] text-bone-2">Tap the heart on any watch to save it here for later.</p>
        <Link href="/watches" className="btn btn-gold mt-5">
          Shop watches <ArrowRight className="size-4" strokeWidth={2} />
        </Link>
        {!signedIn && (
          <p className="mt-4 text-[13px] text-mute">
            <Link href="/login?next=/wishlist" className="font-semibold text-gold-2 hover:underline">
              Sign in
            </Link>{" "}
            to keep your wishlist across devices.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <p className="mt-2 text-[13px] text-mute">
        {visible.length} saved {visible.length === 1 ? "item" : "items"}
        {!signedIn && (
          <>
            {" · "}
            <Link href="/login?next=/wishlist" className="font-semibold text-gold-2 hover:underline">
              Sign in to sync
            </Link>
          </>
        )}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {visible.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>
    </>
  );
}
