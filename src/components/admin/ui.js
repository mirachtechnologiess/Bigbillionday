"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Copy, ImagePlus, Loader2, Search, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { cn, ORDER_STATUS_LABEL } from "@/lib/utils";
import { uploadImage } from "./fetcher";

/* ───────── Pills ───────── */

export function Pill({ tone = "mute", dot = true, className, children, title }) {
  return (
    <span className={cn("pill", className)} data-tone={tone} data-dot={dot ? undefined : "false"} title={title}>
      {children}
    </span>
  );
}

export const ORDER_TONE = {
  PENDING: "gold",
  CONFIRMED: "info",
  PACKED: "info",
  SHIPPED: "info",
  OUT_FOR_DELIVERY: "info",
  DELIVERED: "lume",
  CANCELLED: "danger",
  RETURN_REQUESTED: "ember",
  RETURNED: "mute",
};
export const OrderStatusPill = ({ status }) => <Pill tone={ORDER_TONE[status] || "mute"}>{ORDER_STATUS_LABEL[status] || status}</Pill>;

const PRODUCT_TONE = { ACTIVE: "lume", DRAFT: "gold", ARCHIVED: "mute" };
export const ProductStatusPill = ({ status }) => <Pill tone={PRODUCT_TONE[status]}>{status[0] + status.slice(1).toLowerCase()}</Pill>;

export const PAYMENT_TONE = { PAID: "lume", PENDING: "gold", FAILED: "danger", REFUNDED: "mute" };

export function RiskPill({ score, reason }) {
  if (score === null || score === undefined) return <span className="text-mute text-xs">—</span>;
  const tone = score >= 70 ? "danger" : score >= 40 ? "ember" : "lume";
  return (
    <Pill tone={tone} title={reason || undefined}>
      <span className="a-num">{score}</span>
      <span className="hidden sm:inline">{score >= 70 ? "high" : score >= 40 ? "watch" : "low"}</span>
    </Pill>
  );
}

export function StockPill({ stock, lowStockAt = 3 }) {
  if (stock <= 0) return <Pill tone="danger">Out</Pill>;
  if (stock <= lowStockAt) return <Pill tone="gold"><span className="a-num">{stock}</span> low</Pill>;
  return <Pill tone="lume"><span className="a-num">{stock}</span></Pill>;
}

/* ───────── Layout bits ───────── */

export function PageHeader({ eyebrow, title, description, actions, back }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back} className="mb-2 inline-flex items-center gap-1 text-xs text-mute hover:text-bone">
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </Link>
        )}
        {eyebrow && <div className="eyebrow mb-1.5 !text-[10px]">{eyebrow}</div>}
        <h1 className="font-display text-[30px] leading-none tracking-tight sm:text-[36px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[13px] text-mute">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className, bodyClass, icon: Icon }) {
  return (
    <section className={cn("a-card", className)}>
      {(title || actions) && (
        <header className="a-card-h">
          <div className="a-card-t flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-gold" />}
            {title}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("a-card-b", bodyClass)}>{children}</div>
    </section>
  );
}

export function Field({ label, hint, children, className, counter, max, right }) {
  return (
    <label className={cn("block", className)}>
      {(label || right) && (
        <span className="mb-1.5 flex items-center justify-between gap-2">
          <span className="a-label !mb-0">{label}</span>
          <span className="flex items-center gap-2">
            {right}
            {max ? (
              <span className={cn("a-num text-[10.5px]", (counter ?? 0) > max ? "text-danger" : (counter ?? 0) > max * 0.9 ? "text-gold" : "text-mute")}>
                {counter ?? 0}/{max}
              </span>
            ) : null}
          </span>
        </span>
      )}
      {children}
      {hint && <span className="a-hint block">{hint}</span>}
    </label>
  );
}

export function Empty({ icon: Icon = Sparkles, title = "Nothing here yet", children, action }) {
  return (
    <div className="a-dots flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-2 px-6 py-14 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full border border-line-2 bg-ink-3">
        <Icon className="h-5 w-5 text-gold" />
      </div>
      <div className="font-display text-2xl">{title}</div>
      {children && <p className="mt-1 max-w-md text-[13px] text-mute">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const Spinner = ({ className }) => <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;

/* ───────── Stat tile with sparkline ───────── */

export function Sparkline({ data = [], width = 120, height = 34, stroke = "var(--color-gold)", fill = true }) {
  if (!data.length) return <svg width={width} height={height} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const pts = data.map((v, i) => [i * step, height - 3 - ((v - min) / span) * (height - 6)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const id = `sg${Math.abs(data.reduce((a, b) => a * 31 + b, 7) % 1e9)}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden>
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
        </>
      )}
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="2.5" fill={stroke} />
    </svg>
  );
}

export function Stat({ label, value, sub, delta, spark, icon: Icon, tone = "gold", href }) {
  const color = tone === "lume" ? "var(--color-lume)" : tone === "ember" ? "var(--color-ember)" : "var(--color-gold)";
  const body = (
    <div className="a-card group relative h-full overflow-hidden p-4 transition-colors hover:border-line-2">
      <div className="flex items-center justify-between">
        <span className="a-label !mb-0">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-mute transition-colors group-hover:text-gold" />}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="a-num truncate text-[22px] font-medium tracking-tight sm:text-[26px]">{value}</div>
          <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-mute">
            {typeof delta === "number" && Number.isFinite(delta) && (
              <span className={cn("a-num", delta >= 0 ? "text-lume" : "text-ember")}>
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}%
              </span>
            )}
            {sub}
          </div>
        </div>
        {spark && <Sparkline data={spark} stroke={color} width={96} height={32} />}
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/* ───────── Inputs ───────── */

export function Toggle({ checked, onChange, label, disabled, hint }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", disabled && "pointer-events-none opacity-50")}>
      <button
        type="button"
        role="switch"
        aria-checked={!!checked}
        onClick={() => onChange?.(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 flex-none rounded-full border transition-colors",
          checked ? "border-gold bg-gold" : "border-line-2 bg-ink-4"
        )}
      >
        <span className={cn("absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all", checked ? "left-[18px] bg-white shadow-sm" : "left-0.5 bg-white shadow-sm")} />
      </button>
      {(label || hint) && (
        <span className="min-w-0">
          {label && <span className="block text-[13px]">{label}</span>}
          {hint && <span className="block text-[11.5px] text-mute">{hint}</span>}
        </span>
      )}
    </label>
  );
}

export function TagInput({ value = [], onChange, placeholder = "Type and press Enter", suggestions = [], className, max = 40 }) {
  const [text, setText] = useState("");
  const add = (raw) => {
    const parts = String(raw).split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    onChange([...new Set([...value, ...parts])].slice(0, max));
    setText("");
  };
  const unused = suggestions.filter((s) => !value.includes(s));
  return (
    <div className={className}>
      <div className="a-input flex !h-auto min-h-9 flex-wrap items-center gap-1.5 !py-1.5">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-md border border-line-2 bg-ink-3 px-1.5 py-0.5 text-[12px]">
            {t}
            <button type="button" className="text-mute hover:text-danger" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value) : setText(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(text);
            } else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => text && add(text)}
          placeholder={value.length ? "" : placeholder}
          className="min-w-[120px] flex-1 bg-transparent text-[13px] outline-none placeholder:text-mute"
        />
      </div>
      {unused.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {unused.slice(0, 14).map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-md border border-dashed border-line-2 px-1.5 py-0.5 text-[11px] text-mute hover:border-gold hover:text-gold-2">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Debounced search box bound to a URL search param. */
export function SearchInput({ param = "q", placeholder = "Search…", className }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [v, setV] = useState(sp.get(param) || "");
  const [pending, start] = useTransition();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      const next = new URLSearchParams(sp.toString());
      if (v) next.set(param, v);
      else next.delete(param);
      next.delete("page");
      start(() => router.replace(`${pathname}?${next.toString()}`));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="a-input !pl-8" />
      {pending && <Spinner className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mute" />}
    </div>
  );
}

/** Hook: update URL search params from client components. */
export function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const set = (patch, { resetPage = true } = {}) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, val] of Object.entries(patch)) {
      if (val === null || val === undefined || val === "") next.delete(k);
      else next.set(k, String(val));
    }
    if (resetPage && !("page" in patch)) next.delete("page");
    start(() => router.replace(`${pathname}?${next.toString()}`));
  };
  return { sp, set, pending };
}

export function Pagination({ page, pages, total }) {
  const { set } = useQueryState();
  if (pages <= 1) return total !== undefined ? <div className="mt-3 text-xs text-mute">{total} result{total === 1 ? "" : "s"}</div> : null;
  return (
    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-mute">
      <span>
        Page <span className="a-num text-bone">{page}</span> of <span className="a-num">{pages}</span>
        {total !== undefined && <> · {total} results</>}
      </span>
      <div className="flex gap-1.5">
        <button className="a-btn a-btn-sm a-btn-icon" disabled={page <= 1} onClick={() => set({ page: page - 1 }, { resetPage: false })} aria-label="Previous page">
          <ChevronLeft />
        </button>
        <button className="a-btn a-btn-sm a-btn-icon" disabled={page >= pages} onClick={() => set({ page: page + 1 }, { resetPage: false })} aria-label="Next page">
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn("a-tabs", className)} role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" type="button" className="a-tab" data-active={value === t.value} onClick={() => onChange(t.value)}>
          {t.icon && <t.icon className="h-3.5 w-3.5" />}
          {t.label}
          {t.count !== undefined && <span className="a-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ───────── Overlays ───────── */

export function Modal({ open, onClose, title, children, footer, width = 520 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] grid place-items-end bg-bone/30 backdrop-blur-[2px] sm:place-items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
          <motion.div
            role="dialog"
            aria-modal="true"
            className="a-card flex max-h-[92dvh] w-full flex-col overflow-hidden !rounded-b-none shadow-2xl sm:!rounded-2xl"
            style={{ maxWidth: width }}
            initial={{ y: 30, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="a-card-h">
              <div className="a-card-t">{title}</div>
              <button className="a-btn a-btn-ghost a-btn-sm a-btn-icon" onClick={onClose} aria-label="Close">
                <X />
              </button>
            </div>
            <div className="overflow-y-auto p-4">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-line p-3">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Button that asks for confirmation before running an async action. */
export function ConfirmButton({ onConfirm, children, title = "Are you sure?", message, confirmLabel = "Confirm", danger = true, className = "a-btn a-btn-sm", disabled, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button type="button" className={className} disabled={disabled} onClick={() => setOpen(true)} aria-label={ariaLabel}>
        {children}
      </button>
      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title={title}
        width={420}
        footer={
          <>
            <button className="a-btn a-btn-ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
            <button
              className={cn("a-btn", danger ? "a-btn-danger" : "a-btn-gold")}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  setOpen(false);
                } catch (e) {
                  toast.error(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy && <Spinner />} {confirmLabel}
            </button>
          </>
        }
      >
        <p className="text-[13px] text-bone-2">{message || "This action cannot be undone."}</p>
      </Modal>
    </>
  );
}

export function CopyButton({ text, label, className = "a-btn a-btn-sm a-btn-ghost" }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          toast.success("Copied");
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Copy failed");
        }
      }}
    >
      {done ? <Check /> : <Copy />} {label}
    </button>
  );
}

/** Single-image picker (logos, category images, banners). value = url string. */
export function ImagePicker({ value, onChange, folder = "misc", className, aspect = "aspect-[16/9]", label = "Upload image" }) {
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);
  const handle = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const r = await uploadImage(file, folder);
      onChange(r.url, r);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className={cn("group relative overflow-hidden rounded-xl border border-dashed bg-ink-2 transition-colors", drag ? "border-gold" : "border-line-2", aspect, className)}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handle(e.dataTransfer.files?.[0]);
      }}
    >
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <button type="button" onClick={() => inputRef.current?.click()} className={cn("absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs text-mute transition-opacity", value ? "bg-white/80 opacity-0 group-hover:opacity-100" : "")}>
        {busy ? <Spinner /> : <ImagePlus className="h-5 w-5" />}
        <span>{busy ? "Uploading…" : value ? "Replace" : label}</span>
      </button>
      {value && !busy && (
        <button type="button" className="a-btn a-btn-sm a-btn-icon absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100" onClick={() => onChange("")} aria-label="Remove image">
          <X />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
    </div>
  );
}

export function fmtDate(d, withTime = false) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: withTime ? undefined : "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Asia/Kolkata",
  });
}

export function timeAgo(d) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(d);
}
