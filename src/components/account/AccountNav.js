"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Heart, LayoutDashboard, LogOut, MapPin, Package, User } from "lucide-react";
import { useWishlist } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "Overview", icon: LayoutDashboard },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/profile", label: "Profile", icon: User },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
];

export default function AccountNav() {
  const pathname = usePathname();
  const isActive = (href) => (href === "/account" ? pathname === "/account" : pathname.startsWith(href));
  return (
    <nav
      aria-label="Account"
      className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:overflow-hidden lg:rounded-xl lg:border lg:border-line lg:bg-white lg:px-0"
    >
      <ul className="flex min-w-max gap-2 lg:min-w-0 lg:flex-col lg:gap-0">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors lg:rounded-none lg:border-0 lg:border-b lg:border-line lg:border-l-[3px] lg:py-3 lg:text-[14px]",
                  active
                    ? "border-gold bg-gold-3 text-gold-2 lg:border-l-gold"
                    : "border-line bg-white text-bone-2 hover:text-bone lg:border-l-transparent lg:hover:bg-ink-2"
                )}
              >
                <Icon className="size-4" strokeWidth={2} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
        <li>
          <LogoutButton />
        </li>
      </ul>
    </nav>
  );
}

export function LogoutButton({ className }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch {}
        useWishlist.getState().setAll([]);
        router.replace("/");
        router.refresh();
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-full border border-line bg-white px-4 py-2 text-[13px] font-medium text-bone-2 transition hover:border-ember/50 hover:text-ember lg:rounded-none lg:border-0 lg:border-l-[3px] lg:border-l-transparent lg:py-3 lg:text-[14px]",
        className
      )}
    >
      <LogOut className="size-4" strokeWidth={2} />
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
