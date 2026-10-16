"use client";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-store";
import ProductRail from "./ProductRail";

/**
 * Records the current product in "recently viewed", pings the view counter once per session,
 * and renders the other recently viewed watches.
 * `current` = card-shaped product (catalog.cardSelect).
 */
export default function RecentlyViewed({ current }) {
  const pushRecent = useCart((s) => s.pushRecent);
  const recent = useCart((s) => s.recentlyViewed);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!current?.slug) return;
    pushRecent(current);
    // fire-and-forget view counter (once per product per session)
    try {
      const key = `ps-viewed:${current.id}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        const body = JSON.stringify({ productId: current.id });
        if (!(navigator.sendBeacon && navigator.sendBeacon("/api/track/view", new Blob([body], { type: "application/json" })))) {
          fetch("/api/track/view", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.slug]);

  const items = mounted ? recent.filter((p) => p?.slug && p.slug !== current?.slug && p.id && p.name).slice(0, 10) : [];
  if (!items.length) return null;

  return (
    <div className="container-lux mt-6">
      <div className="rounded-xl border border-line bg-white p-3 sm:p-5">
        <ProductRail title="Recently viewed" products={items.map((p) => ({ ...p, images: p.images || [], brand: p.brand || { name: "" } }))} />
      </div>
    </div>
  );
}
