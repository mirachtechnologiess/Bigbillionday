"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import { toast } from "sonner";
import { cn, storeUrl } from "@/lib/utils";
import { NAV } from "./nav";
import CommandPalette from "./CommandPalette";
import { useAdminPathname } from "./ui";

function Crown({ className }) {
  // a tiny watch-crown mark
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="7.5" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="1" />
      <path d="M16 16 L16 10.5 M16 16 L20 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="27" y="14" width="3" height="4" rx="1" fill="currentColor" />
    </svg>
  );
}

function NavList({ collapsed, badges, onNavigate }) {
  const pathname = useAdminPathname();
  const isActive = (it) => (it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(it.href + "/"));
  return (
    <nav className="flex-1 overflow-y-auto px-2 pb-4">
      {NAV.map((g) => (
        <div key={g.label} className="mt-4 first:mt-2">
          {!collapsed && <div className="px-3 pb-1.5 font-mono text-[9.5px] uppercase tracking-[0.2em] text-mute/70">{g.label}</div>}
          {collapsed && <div className="mx-3 mb-2 border-t border-line" />}
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const active = isActive(it);
              const count = it.badge ? badges?.[it.badge] : 0;
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={onNavigate}
                    title={collapsed ? it.label : undefined}
                    className={cn(
                      "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] transition-colors",
                      active ? "bg-gold-3 font-semibold text-gold-2" : "text-bone-2 hover:bg-ink-2 hover:text-bone",
                      collapsed && "justify-center px-0"
                    )}
                  >
                    {active && <motion.span layoutId="nav-active" className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-gold" />}
                    <it.icon className={cn("h-[17px] w-[17px] flex-none", active ? "text-gold" : it.accent ? "text-gold-2" : "text-mute group-hover:text-bone-2")} />
                    {!collapsed && <span className={cn("truncate", it.accent && !active && "text-gold-2")}>{it.label}</span>}
                    {count > 0 && (
                      <span
                        className={cn(
                          "a-num rounded-full bg-gold px-1.5 font-semibold text-white text-[10px] leading-[18px]",
                          collapsed ? "absolute right-1 top-0.5" : "ml-auto"
                        )}
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function AdminShell({ user, badges, storeName, aiOn, children }) {
  const router = useRouter();
  const pathname = useAdminPathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("adm-collapsed") === "1");
    } catch {}
  }, []);
  useEffect(() => setMobile(false), [pathname]);

  // global shortcuts: Ctrl/Cmd+K palette, "g x" go-to sequences, "[" toggles sidebar
  useEffect(() => {
    let g = false;
    let t;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
        return;
      }
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target?.isContentEditable || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        setPalette(true);
        return;
      }
      if (e.key === "[") toggle();
      if (g) {
        const map = { d: "/admin", p: "/admin/products", o: "/admin/orders", c: "/admin/customers", n: "/admin/products/new", s: "/admin/settings", a: "/admin/ai-studio", i: "/admin/inventory", r: "/admin/reviews" };
        if (map[e.key]) router.push(map[e.key]);
        g = false;
        return;
      }
      if (e.key === "g") {
        g = true;
        clearTimeout(t);
        t = setTimeout(() => (g = false), 900);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem("adm-collapsed", c ? "0" : "1");
      } catch {}
      return !c;
    });

  const logout = async () => {
    try {
      await fetch("/api/auth-admin/logout", { method: "POST" });
    } catch {}
    toast.success("Signed out");
    window.location.assign(window.location.hostname.startsWith("admin.") ? "/login" : "/admin/login");
    router.refresh();
  };

  const sidebarInner = (isMobile) => (
    <>
      <div className={cn("flex h-14 items-center gap-2.5 border-b border-line px-4", collapsed && !isMobile && "justify-center px-0")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.png" alt="" width={30} height={30} className="h-[30px] w-[30px] flex-none" />
        {(!collapsed || isMobile) && (
          <div className="min-w-0 leading-tight">
            <div className="truncate font-sans text-[17px] font-extrabold tracking-[-0.02em]">{storeName}</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-mute">Mission control</div>
          </div>
        )}
        {isMobile && (
          <button className="a-btn a-btn-ghost a-btn-sm a-btn-icon ml-auto" onClick={() => setMobile(false)} aria-label="Close menu">
            <X />
          </button>
        )}
      </div>
      <NavList collapsed={collapsed && !isMobile} badges={badges} onNavigate={() => setMobile(false)} />
      <div className={cn("border-t border-line p-2", collapsed && !isMobile && "flex flex-col items-center")}>
        <div className={cn("flex items-center gap-2 rounded-lg px-2 py-2", collapsed && !isMobile && "px-0")}>
          <div className="grid h-8 w-8 flex-none place-items-center rounded-full border border-gold/40 bg-gold/10 text-[12px] font-semibold text-gold-2">
            {user.name?.[0]?.toUpperCase() || "A"}
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px]">{user.name}</div>
              <div className="font-mono text-[9.5px] uppercase tracking-widest text-mute">{user.role}</div>
            </div>
          )}
          {(!collapsed || isMobile) && (
            <button className="a-btn a-btn-ghost a-btn-sm a-btn-icon" onClick={logout} title="Sign out" aria-label="Sign out">
              <LogOut />
            </button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="adm flex">
      {/* desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh flex-none flex-col border-r border-line bg-ink transition-[width] duration-300 lg:flex no-print",
          collapsed ? "w-[64px]" : "w-[236px]"
        )}
      >
        {sidebarInner(false)}
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobile && (
          <>
            <motion.div className="fixed inset-0 z-[70] bg-bone/30 backdrop-blur-[2px] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobile(false)} />
            <motion.aside
              className="fixed inset-y-0 left-0 z-[71] flex w-[270px] flex-col border-r border-line bg-ink lg:hidden"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              {sidebarInner(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-line bg-ink/90 px-3 backdrop-blur-md sm:px-5 no-print">
          <button className="a-btn a-btn-ghost a-btn-icon lg:hidden" onClick={() => setMobile(true)} aria-label="Open menu">
            <Menu />
          </button>
          <button className="a-btn a-btn-ghost a-btn-icon hidden lg:inline-flex" onClick={toggle} aria-label="Toggle sidebar" title="Toggle sidebar  [">
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </button>
          <button
            onClick={() => setPalette(true)}
            className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-ink-2 px-3 text-left text-[13px] text-mute transition-colors hover:border-line-2 sm:max-w-md"
          >
            <Search className="h-4 w-4 flex-none" />
            <span className="truncate">Search products, orders, customers…</span>
            <span className="ml-auto hidden items-center gap-1 sm:flex">
              <span className="a-kbd">Ctrl</span>
              <span className="a-kbd">K</span>
            </span>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className={cn("pill hidden md:inline-flex", "!h-7")} data-tone={aiOn ? "lume" : "mute"} title={aiOn ? "NVIDIA NIM connected" : "NVIDIA key not set (Settings → AI)"}>
              AI {aiOn ? "online" : "offline"}
            </span>
            <a href={storeUrl("/")} target="_blank" rel="noreferrer" className="a-btn a-btn-ghost a-btn-sm">
              <ExternalLink /> <span className="hidden sm:inline">Storefront</span>
            </a>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-3 py-5 sm:px-6 sm:py-6 lg:px-8">{children}</main>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
