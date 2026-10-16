"use client";
import { useWishlist } from "@/lib/cart-store";

/** After sign-in: merge the guest wishlist into the account and adopt the server list. */
export async function syncWishlist() {
  try {
    const local = useWishlist.getState().ids || [];
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merge: local.slice(0, 60) }),
    });
    const data = await res.json();
    if (Array.isArray(data.ids)) useWishlist.getState().setAll(data.ids);
  } catch {}
}
