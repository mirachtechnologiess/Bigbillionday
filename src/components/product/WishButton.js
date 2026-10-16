"use client";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useWishlist } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

/** Heart toggle: local wishlist store + best-effort account sync via POST /api/wishlist. */
export default function WishButton({ productId, name, className, size = 17 }) {
  const [mounted, setMounted] = useState(false);
  const wished = useWishlist((s) => s.ids.includes(productId));
  const toggle = useWishlist((s) => s.toggle);
  useEffect(() => setMounted(true), []);
  const on = mounted && wished;

  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(productId);
    fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, wished: !on }),
    }).catch(() => {});
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={on ? `Remove ${name || "watch"} from wishlist` : `Add ${name || "watch"} to wishlist`}
      className={cn(
        "grid place-items-center rounded-full border bg-white shadow-sm transition-colors duration-200",
        on ? "border-ember/40 text-ember" : "border-line text-mute hover:border-ember/40 hover:text-ember",
        className
      )}
    >
      <motion.span key={on ? "on" : "off"} initial={{ scale: on ? 0.5 : 1 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 520, damping: 14 }}>
        <Heart size={size} strokeWidth={2} fill={on ? "currentColor" : "none"} />
      </motion.span>
    </button>
  );
}
