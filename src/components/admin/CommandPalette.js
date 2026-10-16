"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CornerDownLeft, Search, ShoppingBag, User, Watch } from "lucide-react";
import { cn, formatINR, ORDER_STATUS_LABEL } from "@/lib/utils";
import { NAV, QUICK_ACTIONS } from "./nav";
import { Spinner } from "./ui";

const PAGES = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));

export default function CommandPalette({ open, onClose }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [remote, setRemote] = useState({ products: [], orders: [], customers: [] });
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setRemote({ products: [], orders: [], customers: [] });
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setRemote({ products: [], orders: [], customers: [] });
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/admin/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (r.ok) setRemote(await r.json());
      } catch {}
      setLoading(false);
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, open]);

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    const match = (s) => !term || s.toLowerCase().includes(term);
    const out = [];
    const actions = QUICK_ACTIONS.filter((a) => match(a.label));
    const pages = PAGES.filter((p) => match(p.label) || match(p.group));
    actions.forEach((a) => out.push({ section: "Actions", key: "a" + a.href, label: a.label, hint: a.hint, icon: a.icon, href: a.href }));
    pages.forEach((p) => out.push({ section: "Go to", key: "p" + p.href, label: p.label, hint: p.group, icon: p.icon, href: p.href, keys: p.keys }));
    remote.products?.forEach((p) =>
      out.push({ section: "Products", key: "pr" + p.id, label: p.name, hint: `${p.sku} · ${formatINR(p.price)} · stock ${p.stock}`, image: p.image, icon: Watch, href: `/admin/products/${p.id}` })
    );
    remote.orders?.forEach((o) =>
      out.push({ section: "Orders", key: "o" + o.id, label: `#${o.orderNumber} — ${o.shippingName}`, hint: `${formatINR(o.total)} · ${ORDER_STATUS_LABEL[o.status]}`, icon: ShoppingBag, href: `/admin/orders/${o.id}` })
    );
    remote.customers?.forEach((c) =>
      out.push({ section: "Customers", key: "c" + c.id, label: c.name, hint: [c.email, c.phone].filter(Boolean).join(" · "), icon: User, href: `/admin/customers/${c.id}` })
    );
    return term ? out : out.slice(0, 14);
  }, [q, remote]);

  useEffect(() => setActive(0), [items.length]);

  const go = (it) => {
    if (!it) return;
    onClose();
    router.push(it.href);
  };

  const onKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(items[active]);
    } else if (e.key === "Escape") onClose();
  };

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  let lastSection = null;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-start justify-center bg-bone/30 px-3 pt-[10vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="a-card w-full max-w-[640px] overflow-hidden shadow-[0_30px_80px_-30px_rgba(17,24,39,.4)]"
            initial={{ y: -12, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 380 }}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-4 w-4 text-gold" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder="Jump to a page, search a product, order # or phone…"
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-mute"
              />
              {loading ? <Spinner className="text-mute" /> : <span className="a-kbd">Esc</span>}
            </div>
            <div ref={listRef} className="max-h-[56vh] overflow-y-auto p-2">
              {items.length === 0 && <div className="px-3 py-10 text-center text-sm text-mute">{loading ? "Searching…" : "No matches."}</div>}
              {items.map((it, i) => {
                const header = it.section !== lastSection ? it.section : null;
                lastSection = it.section;
                return (
                  <div key={it.key}>
                    {header && <div className="px-3 pb-1 pt-3 font-mono text-[9.5px] uppercase tracking-[0.2em] text-mute">{header}</div>}
                    <button
                      data-idx={i}
                      onMouseMove={() => setActive(i)}
                      onClick={() => go(it)}
                      className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left", i === active ? "bg-ink-4" : "")}
                    >
                      {it.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.image} alt="" className="h-8 w-8 flex-none rounded-md object-cover" />
                      ) : (
                        <span className="grid h-8 w-8 flex-none place-items-center rounded-md border border-line bg-ink-3">
                          <it.icon className={cn("h-4 w-4", i === active ? "text-gold" : "text-mute")} />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px]">{it.label}</span>
                        {it.hint && <span className="block truncate text-[11.5px] text-mute">{it.hint}</span>}
                      </span>
                      {it.keys && <span className="a-kbd hidden sm:inline-flex">{it.keys}</span>}
                      {i === active ? <CornerDownLeft className="h-3.5 w-3.5 text-gold" /> : <ArrowRight className="h-3.5 w-3.5 text-transparent" />}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-[11px] text-mute">
              <span><span className="a-kbd">↑</span> <span className="a-kbd">↓</span> navigate</span>
              <span><span className="a-kbd">↵</span> open</span>
              <span className="hidden sm:inline"><span className="a-kbd">g</span> then <span className="a-kbd">p</span>/<span className="a-kbd">o</span>/<span className="a-kbd">d</span> jump</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
