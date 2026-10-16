"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Client cart + recently viewed. Persisted to localStorage.
 * item: { productId, slug, name, brand, image, price, mrp, stock, quantity }
 */
export const useCart = create(
  persist(
    (set, get) => ({
      items: [],
      coupon: null, // { code, type, value, minOrder, maxDiscount }
      open: false,
      recentlyViewed: [],

      setOpen: (open) => set({ open }),
      add: (item, qty = 1) => {
        const items = [...get().items];
        const i = items.findIndex((x) => x.productId === item.productId);
        const max = Math.max(1, item.stock ?? 10);
        if (i >= 0) items[i] = { ...items[i], ...item, quantity: Math.min(max, items[i].quantity + qty) };
        else items.push({ ...item, quantity: Math.min(max, qty) });
        set({ items, open: true });
      },
      setQty: (productId, quantity) =>
        set({
          items: get()
            .items.map((x) => (x.productId === productId ? { ...x, quantity: Math.max(1, Math.min(x.stock || 10, quantity)) } : x)),
        }),
      remove: (productId) => set({ items: get().items.filter((x) => x.productId !== productId) }),
      clear: () => set({ items: [], coupon: null }),
      setCoupon: (coupon) => set({ coupon }),
      count: () => get().items.reduce((s, i) => s + i.quantity, 0),
      pushRecent: (p) =>
        set({ recentlyViewed: [p, ...get().recentlyViewed.filter((r) => r.slug !== p.slug)].slice(0, 12) }),
    }),
    {
      name: "ps-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items, coupon: s.coupon, recentlyViewed: s.recentlyViewed }),
    }
  )
);

/** Guest wishlist (synced to the account when logged in via /api/wishlist). */
export const useWishlist = create(
  persist(
    (set, get) => ({
      ids: [],
      has: (id) => get().ids.includes(id),
      toggle: (id) => set({ ids: get().ids.includes(id) ? get().ids.filter((x) => x !== id) : [...get().ids, id] }),
      setAll: (ids) => set({ ids }),
    }),
    { name: "ps-wishlist", storage: createJSONStorage(() => localStorage) }
  )
);
