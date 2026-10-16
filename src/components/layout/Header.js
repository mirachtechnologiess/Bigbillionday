"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Heart, Menu, ShoppingCart, Truck, UserRound } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import Wordmark from "./Wordmark";
import HeaderSearch from "./HeaderSearch";
import { CATEGORY_NAV, isActive } from "./nav";

const MenuOverlay = dynamic(() => import("./MenuOverlay"), { ssr: false });

function TopStrip({ text }) {
  const parts = String(text || "")
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <div className="bg-teal text-white" role="region" aria-label="Offers">
      <div className="container-lux flex h-8 items-center justify-between gap-4 text-[12px] font-medium sm:text-[12.5px]">
        <p className="flex min-w-0 items-center gap-2 truncate">
          <Truck size={14} className="shrink-0" aria-hidden />
          <span className="truncate">
            {parts.length ? (
              parts.map((p, i) => (
                <span key={i} className={i > 0 ? "hidden sm:inline" : undefined}>
                  {i > 0 && <span className="mx-2 opacity-60">|</span>}
                  {p}
                </span>
              ))
            ) : (
              "Cash on Delivery across India"
            )}
          </span>
        </p>
        <nav aria-label="Quick links" className="hidden shrink-0 items-center gap-5 md:flex">
          <Link href="/track-order" className="hover:underline">
            Track order
          </Link>
          <Link href="/faq" className="hover:underline">
            Help
          </Link>
          <Link href="/contact" className="hover:underline">
            Contact
          </Link>
        </nav>
      </div>
    </div>
  );
}

function CartButton() {
  const [mounted, setMounted] = useState(false);
  const count = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const setOpen = useCart((s) => s.setOpen);
  useEffect(() => setMounted(true), []);
  const n = mounted ? count : 0;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="relative flex h-11 items-center gap-1.5 rounded-lg px-2 text-bone transition-colors hover:bg-ink-2"
      aria-label={`Open cart${n ? `, ${n} item${n > 1 ? "s" : ""}` : ""}`}
    >
      <span className="relative">
        <ShoppingCart size={24} strokeWidth={1.9} />
        <span
          className={cn(
            "absolute -right-2 -top-2 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10.5px] font-bold leading-none",
            n > 0 ? "bg-gold text-white" : "bg-ink-3 text-bone-2"
          )}
        >
          {n > 99 ? "99+" : n}
        </span>
      </span>
      <span className="hidden text-[14px] font-bold lg:inline">Cart</span>
    </button>
  );
}

function CategoryRow() {
  const pathname = usePathname();
  const params = useSearchParams();
  const search = params?.toString() || "";
  return (
    <ul className="container-lux flex items-center gap-2 overflow-x-auto py-1.5 [scrollbar-width:none] md:gap-1 md:py-0 [&::-webkit-scrollbar]:hidden">
      {CATEGORY_NAV.map((item) => {
        const active = isActive(item.href, pathname, search);
        return (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "block whitespace-nowrap transition-colors",
                // mobile chips
                "rounded-full border px-3 py-1.5 text-[13px] font-semibold",
                active ? "border-gold bg-gold-3 text-gold-2" : "border-line-2 bg-white text-bone-2",
                item.tone === "ember" && !active && "text-ember",
                item.tone === "lume" && !active && "text-lume",
                // desktop text links
                "md:rounded-none md:border-0 md:border-b-[3px] md:bg-transparent md:px-3 md:py-2.5 md:text-[13.5px]",
                active ? "md:border-gold md:bg-transparent" : "md:border-transparent md:hover:border-line-2 md:hover:text-bone"
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function Header({ settings }) {
  const storeName = settings?.store?.name || "BigBillionDay";
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // who is signed in (for "Hello, name")
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && setUser(j?.user || null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname]);

  useEffect(() => setMenuOpen(false), [pathname]);

  // "/" focuses search
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target?.isContentEditable) return;
      if (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        const input = [...document.querySelectorAll("[data-header-search] input[type=search]")].find((el) => el.offsetParent);
        if (input) {
          e.preventDefault();
          input.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const first = user?.name ? String(user.name).split(" ")[0] : null;

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-gold focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <TopStrip text={settings?.home?.announcement} />
      <header
        className={cn(
          "sticky top-0 z-50 border-b border-line bg-white transition-shadow duration-300",
          scrolled && "shadow-[0_4px_18px_-8px_rgba(17,24,39,0.18)]"
        )}
      >
        <div className="container-lux flex h-[52px] items-center gap-2 md:h-[68px] md:gap-5">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="-ml-1.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-bone hover:bg-ink-2 lg:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <Menu size={24} strokeWidth={2} />
          </button>
          <Link href="/" aria-label={`${storeName} home`} className="shrink-0">
            <Wordmark name={storeName} priority className="text-[27px] md:text-[33px]" />
          </Link>

          <div data-header-search className="hidden flex-1 md:block">
            <Suspense fallback={<div className="h-11 rounded-lg border-2 border-gold bg-white" />}>
              <HeaderSearch className="mx-auto max-w-[760px]" />
            </Suspense>
          </div>

          <div className="ml-auto flex items-center gap-0.5 md:ml-0 md:gap-1.5">
            <Link
              href={user ? "/account" : "/login"}
              className="flex h-11 items-center gap-1.5 rounded-lg px-2 text-bone transition-colors hover:bg-ink-2"
              aria-label={first ? `Account of ${first}` : "Sign in"}
            >
              <UserRound size={23} strokeWidth={1.9} className="lg:hidden" />
              <span className="hidden leading-tight lg:block">
                <span className="block text-[11.5px] text-mute">Hello, {first || "sign in"}</span>
                <span className="block text-[14px] font-bold">Account &amp; Orders</span>
              </span>
            </Link>
            <Link
              href="/wishlist"
              className="hidden h-11 items-center gap-1.5 rounded-lg px-2 text-bone transition-colors hover:bg-ink-2 sm:flex"
              aria-label="Wishlist"
            >
              <Heart size={23} strokeWidth={1.9} />
              <span className="hidden text-[14px] font-bold xl:inline">Wishlist</span>
            </Link>
            <CartButton />
          </div>
        </div>

        {/* mobile search row */}
        <div data-header-search className="container-lux pb-2.5 md:hidden">
          <Suspense fallback={<div className="h-11 rounded-lg border-2 border-gold bg-white" />}>
            <HeaderSearch />
          </Suspense>
        </div>

        {/* category row */}
        <nav aria-label="Categories" className="border-t border-line bg-white md:bg-ink-2/60">
          <Suspense fallback={<div className="h-[45px]" />}>
            <CategoryRow />
          </Suspense>
        </nav>
      </header>

      <AnimatePresence>{menuOpen && <MenuOverlay key="menu" settings={settings} user={user} onClose={closeMenu} />}</AnimatePresence>
    </>
  );
}
