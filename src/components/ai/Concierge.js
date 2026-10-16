"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useCart } from "@/lib/cart-store";

const ConciergePanel = dynamic(() => import("./ConciergePanel"), { ssr: false });

const HIDDEN_PREFIXES = ["/checkout", "/cart", "/order", "/admin"];

export default function Concierge({ storeName, whatsapp }) {
  const pathname = usePathname() || "/";
  const cartOpen = useCart((s) => s.open);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => setMounted(true), []);

  const hiddenRoute = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  // Close the panel if the shopper navigates into a hidden route or opens the cart.
  useEffect(() => {
    if (hiddenRoute || cartOpen) setOpen(false);
  }, [hiddenRoute, cartOpen]);

  if (!mounted || hiddenRoute) return null;

  const showButton = !cartOpen && !open;

  const openPanel = () => {
    setLoaded(true);
    setOpen(true);
  };

  return (
    <>
      <AnimatePresence>
        {showButton && (
          <motion.button
            key="concierge-fab"
            type="button"
            onClick={openPanel}
            aria-label="Chat with our shopping assistant"
            aria-haspopup="dialog"
            aria-expanded={open}
            initial={{ opacity: 0, scale: 0.6, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 12 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="group fixed bottom-[calc(env(safe-area-inset-bottom)+76px)] right-3 z-[65] grid size-12 place-items-center rounded-full bg-gold text-white shadow-[0_10px_28px_-8px_rgb(242_96_12/0.6)] transition-colors hover:bg-gold-2 lg:bottom-6 lg:right-6 lg:size-14"
          >
            <MessageCircle className="size-[22px] lg:size-6" strokeWidth={2} />
            <span aria-hidden className="absolute right-1 top-1 size-3 rounded-full border-2 border-white bg-lume" />
          </motion.button>
        )}
      </AnimatePresence>

      {loaded && (
        <ConciergePanel open={open && !cartOpen} onClose={() => setOpen(false)} storeName={storeName} whatsapp={whatsapp} />
      )}
    </>
  );
}
