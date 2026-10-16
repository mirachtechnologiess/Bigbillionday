"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Heart, Package, ShoppingCart, UserRound, X } from "lucide-react";
import { CATEGORY_NAV, HELP_LINKS, PRICE_LINKS } from "./nav";
import { useEscape, useScrollLock } from "./useScrollLock";
import Wordmark from "./Wordmark";

const EASE = [0.22, 1, 0.36, 1];

function Group({ title, links, onClose }) {
  return (
    <div className="border-b border-line py-3">
      <p className="px-5 pb-1 pt-1 text-[13px] font-bold uppercase tracking-wide text-mute">{title}</p>
      <ul>
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} onClick={onClose} className="flex items-center justify-between px-5 py-2.5 text-[15px] text-bone hover:bg-ink-2">
              {l.label}
              <ChevronRight size={16} className="text-mute" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Left slide-in drawer with every storefront link (mobile + tablet). */
export default function MenuOverlay({ settings, user, onClose }) {
  useScrollLock(true);
  useEscape(true, onClose);
  const store = settings?.store || {};
  const first = user?.name ? String(user.name).split(" ")[0] : null;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Menu">
      <motion.button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-bone/45"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.aside
        data-lenis-prevent
        initial={{ x: "-100%" }}
        animate={{ x: 0 }}
        exit={{ x: "-100%", transition: { duration: 0.25, ease: EASE } }}
        transition={{ duration: 0.35, ease: EASE }}
        className="absolute inset-y-0 left-0 flex w-[86%] max-w-[360px] flex-col overflow-y-auto bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between bg-teal px-5 py-4 text-white">
          <Link href={user ? "/account" : "/login"} onClick={onClose} className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20">
              <UserRound size={20} />
            </span>
            <span>
              <span className="block text-[12px] opacity-85">{first ? "Welcome back" : "Hello"}</span>
              <span className="block text-[17px] font-bold">{first ? first : "Sign in / Register"}</span>
            </span>
          </Link>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/15" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <Group title="Shop by category" links={CATEGORY_NAV} onClose={onClose} />
        <Group title="Shop by price" links={PRICE_LINKS} onClose={onClose} />

        <div className="border-b border-line py-3">
          <p className="px-5 pb-1 pt-1 text-[13px] font-bold uppercase tracking-wide text-mute">Your account</p>
          <ul>
            {[
              [UserRound, "My account", user ? "/account" : "/login"],
              [Package, "My orders", "/account/orders"],
              [Heart, "Wishlist", "/wishlist"],
              [ShoppingCart, "Cart", "/cart"],
            ].map(([Icon, label, href]) => (
              <li key={label}>
                <Link href={href} onClick={onClose} className="flex items-center gap-3 px-5 py-2.5 text-[15px] text-bone hover:bg-ink-2">
                  <Icon size={18} className="text-mute" /> {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Group title="Help" links={HELP_LINKS} onClose={onClose} />

        <div className="mt-auto bg-ink-2 px-5 py-5">
          <Wordmark name={store.name} className="text-[20px]" />
          <p className="mt-2 text-[12.5px] text-bone-2">Cash on Delivery · Easy 7-day returns · Quality checked</p>
        </div>
      </motion.aside>
    </div>
  );
}
