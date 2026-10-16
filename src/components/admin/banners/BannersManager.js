"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, CalendarClock, GalleryHorizontalEnd, ImageOff, Megaphone, Package, Plus, Search, Sparkles, Trash2, Type, X } from "lucide-react";
import { api } from "@/components/admin/fetcher";
import { Card, ConfirmButton, Empty, Field, ImagePicker, PageHeader, Pill, Spinner, Tabs, Toggle } from "@/components/admin/ui";
import { cn, formatINR } from "@/lib/utils";
import { ReorderButtons, SplitEditor, moveItem, useEscape, useIsDesktop } from "@/components/admin/brands/shared";

const PLACEMENTS = {
  home_hero: { label: "Home · Hero", hint: "Full-width deal slider at the top of the homepage", ratio: "21/9" },
  home_strip: { label: "Home · Strip", hint: "Slim band between homepage sections", ratio: "21/9" },
  home_promo: { label: "Home · Promo", hint: "Promo tiles further down the homepage", ratio: "16/9" },
  collection_top: { label: "Collection · Top", hint: "Header on collection / listing pages", ratio: "21/9" },
};

/** Mirrors the storefront DealBanner themes (solid colours, no gradients). */
const THEMES = {
  saffron: { label: "Saffron", swatch: "bg-saffron", bg: "bg-saffron", fg: "text-white", sub: "text-white/85", pill: "bg-white/20 text-white", cta: "bg-white text-bone", sticker: "bg-sun text-bone" },
  teal: { label: "Teal", swatch: "bg-teal", bg: "bg-teal", fg: "text-white", sub: "text-white/85", pill: "bg-white/20 text-white", cta: "bg-sun text-bone", sticker: "bg-sun text-bone" },
  crimson: { label: "Crimson", swatch: "bg-crimson", bg: "bg-crimson", fg: "text-white", sub: "text-white/85", pill: "bg-white/20 text-white", cta: "bg-white text-bone", sticker: "bg-sun text-bone" },
  sun: { label: "Sun", swatch: "bg-sun", bg: "bg-sun", fg: "text-bone", sub: "text-bone/75", pill: "bg-bone text-white", cta: "bg-bone text-white", sticker: "bg-crimson text-white" },
  forest: { label: "Forest", swatch: "bg-forest", bg: "bg-forest", fg: "text-white", sub: "text-white/85", pill: "bg-white/20 text-white", cta: "bg-sun text-bone", sticker: "bg-sun text-bone" },
  ink: { label: "Ink", swatch: "bg-bone", bg: "bg-bone", fg: "text-white", sub: "text-white/75", pill: "bg-saffron text-white", cta: "bg-saffron text-white", sticker: "bg-sun text-bone" },
};

const FIELDS = ["title", "subtitle", "image", "ctaLabel", "ctaHref", "badge", "theme", "productId", "startsAt", "endsAt", "placement", "isActive", "sortOrder"];

/** ISO → value for <input type="datetime-local"> (local time). */
const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);

const toForm = (b, placement) => ({
  title: b?.title || "",
  subtitle: b?.subtitle || "",
  image: b?.image || "",
  ctaLabel: b?.ctaLabel || "",
  ctaHref: b?.ctaHref || "",
  badge: b?.badge || "",
  theme: THEMES[b?.theme] ? b.theme : "saffron",
  productId: b?.productId || "",
  product: b?.product || null,
  startsAt: toLocalInput(b?.startsAt),
  endsAt: toLocalInput(b?.endsAt),
  placement: b?.placement || placement || "home_hero",
  isActive: b?.isActive ?? true,
  sortOrder: b?.sortOrder ?? "",
});

/** live | scheduled | expired | off */
function scheduleState(b, now = Date.now()) {
  if (!b.isActive) return "off";
  if (b.startsAt && Date.parse(b.startsAt) > now) return "scheduled";
  if (b.endsAt && Date.parse(b.endsAt) < now) return "expired";
  return "live";
}
const fmtWhen = (iso) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");

function SchedulePill({ b }) {
  const s = scheduleState(b);
  if (s === "scheduled") return <Pill tone="info" title={`Starts ${fmtWhen(b.startsAt)}`}>Starts {fmtWhen(b.startsAt)}</Pill>;
  if (s === "expired") return <Pill tone="mute" title={`Ended ${fmtWhen(b.endsAt)}`}>Ended</Pill>;
  if (s === "live") return <Pill tone="lume">{b.endsAt ? `Live · ends ${fmtWhen(b.endsAt)}` : "Live"}</Pill>;
  return <Pill tone="mute">Hidden</Pill>;
}

export default function BannersManager({ banners, home, isAdmin }) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [items, setItems] = useState(banners);
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState(null); // null | "new" | id
  useEffect(() => setItems(banners), [banners]);

  const close = useCallback(() => setSelected(null), []);
  useEscape(isDesktop && !!selected, close);

  const counts = useMemo(() => {
    const m = { all: items.length };
    for (const b of items) m[b.placement] = (m[b.placement] || 0) + 1;
    return m;
  }, [items]);
  const visible = tab === "all" ? items : items.filter((b) => b.placement === tab);
  const current = selected && selected !== "new" ? items.find((b) => b.id === selected) : null;

  const patch = async (b, data, msg) => {
    setItems((xs) => xs.map((x) => (x.id === b.id ? { ...x, ...data } : x)));
    try {
      await api(`/api/admin/banners/${b.id}`, { method: "PATCH", body: data });
      toast.success(msg);
      router.refresh();
    } catch (e) {
      setItems((xs) => xs.map((x) => (x.id === b.id ? b : x)));
      toast.error(e.message);
    }
  };

  // reorder within the banner's own placement group
  const move = async (b, dir) => {
    const group = items.filter((x) => x.placement === b.placement);
    const i = group.indexOf(b);
    const nextGroup = moveItem(group, i, i + dir);
    if (nextGroup === group) return;
    const prev = items;
    const order = new Map(nextGroup.map((x, k) => [x.id, k]));
    setItems((xs) => xs.map((x) => (order.has(x.id) ? { ...x, sortOrder: order.get(x.id) } : x)).sort((a, z) => a.sortOrder - z.sortOrder));
    try {
      await api("/api/admin/banners/reorder", { method: "POST", body: { ids: nextGroup.map((x) => x.id) } });
      router.refresh();
    } catch (e) {
      setItems(prev);
      toast.error(e.message);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Storefront"
        title="Banners & Homepage"
        description="Deal slides, promo tiles and the words that greet every visitor."
        actions={
          <button className="a-btn a-btn-gold" onClick={() => setSelected("new")}>
            <Plus /> New banner
          </button>
        }
      />

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[{ value: "all", label: "All", count: counts.all }, ...Object.entries(PLACEMENTS).map(([k, v]) => ({ value: k, label: v.label, count: counts[k] || 0 }))]}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_460px]">
        <div className="min-w-0">
          {visible.length === 0 ? (
            <Empty icon={GalleryHorizontalEnd} title="No banners here" action={<button className="a-btn a-btn-gold" onClick={() => setSelected("new")}><Plus /> Create a banner</button>}>
              {tab === "all" ? "Without banners the homepage builds deal slides from the live catalogue." : PLACEMENTS[tab]?.hint}
            </Empty>
          ) : (
            <ul className="grid gap-2">
              {visible.map((b) => {
                const group = items.filter((x) => x.placement === b.placement);
                const gi = group.indexOf(b);
                const th = THEMES[b.theme] || THEMES.saffron;
                const thumb = b.image || b.product?.image;
                return (
                  <li
                    key={b.id}
                    onClick={() => setSelected(b.id)}
                    className={cn(
                      "a-card flex cursor-pointer items-center gap-3 p-2.5 transition-colors hover:border-line-2",
                      selected === b.id && "!border-gold/60 ring-2 ring-gold/15",
                      scheduleState(b) !== "live" && "opacity-70"
                    )}
                  >
                    <div onClick={(e) => e.stopPropagation()}>
                      <ReorderButtons label={b.title} disableUp={gi === 0} disableDown={gi === group.length - 1} onUp={() => move(b, -1)} onDown={() => move(b, 1)} />
                    </div>
                    <div className={cn("relative flex aspect-[21/9] w-28 flex-none items-center overflow-hidden rounded-lg sm:w-36", th.bg, th.fg)}>
                      {b.badge && <span className="z-[1] line-clamp-2 max-w-[60%] pl-2 text-[10px] font-extrabold uppercase leading-tight">{b.badge}</span>}
                      {thumb ? (
                        <img src={thumb} alt="" className={cn("absolute h-full object-cover", b.image ? "inset-0 w-full" : "right-1 top-1 bottom-1 w-[42%] rounded-md bg-white object-contain")} />
                      ) : (
                        !b.badge && <ImageOff className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 opacity-70" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{b.title}</div>
                      {b.subtitle && <div className="truncate text-[12px] text-mute">{b.subtitle}</div>}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <SchedulePill b={b} />
                        <Pill tone="info" dot={false}>{PLACEMENTS[b.placement]?.label || b.placement}</Pill>
                        {b.product && (
                          <span className="inline-flex max-w-[180px] items-center gap-1 truncate text-[11px] text-mute">
                            <Package className="h-3 w-3 flex-none" /> {b.product.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Toggle checked={b.isActive} onChange={(v) => patch(b, { isActive: v }, v ? "Banner live" : "Banner hidden")} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <BannerEditor
          key={selected || "none"}
          banner={current}
          defaultPlacement={tab !== "all" ? tab : "home_hero"}
          open={selected === "new" || !!current}
          isDesktop={isDesktop}
          canDelete={isAdmin}
          onClose={close}
          onSaved={(b) => {
            setItems((xs) => (xs.some((x) => x.id === b.id) ? xs.map((x) => (x.id === b.id ? b : x)) : [...xs, b]));
            setSelected(b.id);
            router.refresh();
          }}
          onDeleted={(id) => {
            setItems((xs) => xs.filter((x) => x.id !== id));
            setSelected(null);
            router.refresh();
          }}
        />
      </div>

      <HomepageCopy home={home} isAdmin={isAdmin} />
    </div>
  );
}

/** Same composition as the storefront deal slide: solid theme, big badge, copy + CTA left, product right. */
function BannerPreview({ b, ratio }) {
  const th = THEMES[b.theme] || THEMES.saffron;
  const p = b.product;
  const visual = p?.image || b.image;
  const wide = ratio === "21/9";
  return (
    <div className={cn("relative overflow-hidden rounded-xl", th.bg, th.fg)} style={{ aspectRatio: ratio.replace("/", " / ") }}>
      {/* subtle dot pattern like the storefront */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)", backgroundSize: "12px 12px" }} />
      <div className="relative grid h-full grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] items-center gap-2 p-[4.5%]">
        <div className="flex min-w-0 flex-col items-start gap-1">
          <span className={cn("rounded-full px-2 py-0.5 text-[7.5px] font-bold uppercase tracking-[0.12em]", th.pill)}>
            {p?.brand ? `${p.brand} · Limited deal` : "Limited time deal"}
          </span>
          <div className={cn("line-clamp-2 font-extrabold uppercase leading-[0.95] tracking-tight", wide ? "text-[22px]" : "text-[26px]")}>
            {b.badge || (p?.off ? `${p.off}% OFF` : "UP TO 70% OFF")}
          </div>
          <div className={cn("line-clamp-2 whitespace-pre-line font-bold leading-tight", wide ? "text-[12.5px]" : "text-[14px]")}>{b.title || "Your headline here"}</div>
          {(b.subtitle || p?.name) && <div className={cn("line-clamp-1 text-[9.5px]", th.sub)}>{b.subtitle || p?.name}</div>}
          <span className={cn("mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold shadow-sm", th.cta)}>
            {b.ctaLabel || "Shop now"} <ArrowRight className="h-2.5 w-2.5" />
          </span>
        </div>
        <div className="relative flex h-full min-w-0 items-center justify-center">
          {visual ? (
            <div className="relative h-[86%] max-h-full rotate-[-3deg] rounded-xl bg-white p-1.5 shadow-lg" style={{ aspectRatio: p?.image ? "1 / 1" : "4 / 3" }}>
              <img src={visual} alt="" className={cn("h-full w-full rounded-lg", p?.image ? "object-contain" : "object-cover")} />
              {p && (
                <span className={cn("absolute -left-2 -top-2 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold leading-none shadow-md", th.sticker)}>
                  ₹{new Intl.NumberFormat("en-IN").format(p.price)}
                  {p.mrp > p.price && <span className="ml-1 text-[8px] font-semibold line-through opacity-70">₹{new Intl.NumberFormat("en-IN").format(p.mrp)}</span>}
                </span>
              )}
            </div>
          ) : (
            <div className="grid h-[70%] w-[70%] place-items-center rounded-xl border border-dashed border-current/40 text-center text-[9px] opacity-70">Pick a product or upload an image</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ThemePicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Banner colour">
      {Object.entries(THEMES).map(([k, t]) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          title={t.label}
          onClick={() => onChange(k)}
          className={cn("flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-[11.5px] font-medium transition-colors", value === k ? "border-gold bg-gold-3 text-bone" : "border-line-2 bg-ink text-bone-2 hover:border-bone/30")}
        >
          <span className={cn("h-5 w-5 rounded-full ring-1 ring-black/10", t.swatch)} />
          {t.label}
        </button>
      ))}
    </div>
  );
}

function ProductPicker({ product, onChange }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api(`/api/admin/collections/products-search?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        setResults(r.products || []);
      } catch (e) {
        if (e.name !== "AbortError") toast.error(e.message);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (product) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-line-2 bg-ink p-2">
        <div className="h-12 w-12 flex-none overflow-hidden rounded-lg border border-line bg-ink-2">
          {product.image ? <img src={product.image} alt="" className="h-full w-full object-contain" /> : <Package className="m-auto mt-3.5 h-4 w-4 text-mute" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium">{product.name}</div>
          <div className="flex items-center gap-1.5 text-[12px]">
            <span className="a-num font-semibold">{formatINR(product.price)}</span>
            {product.mrp > product.price && <span className="a-num text-mute line-through">{formatINR(product.mrp)}</span>}
            {product.off > 0 && <span className="font-semibold text-lume">{product.off}% off</span>}
            {product.status && product.status !== "ACTIVE" && <Pill tone="ember" dot={false}>{product.status.toLowerCase()}</Pill>}
          </div>
        </div>
        <button type="button" className="a-btn a-btn-ghost a-btn-sm a-btn-icon" onClick={() => onChange(null)} aria-label="Remove featured product" title="Remove">
          <X />
        </button>
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
      <input
        className="a-input !pl-8"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        placeholder="Search a watch to feature (name, SKU, brand)…"
      />
      {loading && <Spinner className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mute" />}
      {open && (
        <ul className="absolute inset-x-0 top-[calc(100%+4px)] z-30 max-h-[280px] divide-y divide-line overflow-y-auto rounded-xl border border-line-2 bg-ink shadow-[0_16px_40px_-16px_rgba(17,24,39,.35)]">
          {results.length === 0 && !loading && <li className="px-3 py-3 text-[12px] text-mute">No products found</li>}
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left hover:bg-ink-2"
                onClick={() => {
                  onChange(p);
                  setOpen(false);
                  setQ("");
                }}
              >
                <div className="h-9 w-9 flex-none overflow-hidden rounded-md border border-line bg-ink-2">{p.image && <img src={p.image} alt="" className="h-full w-full object-contain" />}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px]">{p.name}</div>
                  <div className="truncate font-mono text-[10.5px] text-mute">{[p.brand, p.sku].filter(Boolean).join(" · ")}</div>
                </div>
                <div className="text-right">
                  <div className="a-num text-[12px] font-semibold">{formatINR(p.price)}</div>
                  {p.off > 0 && <div className="text-[10.5px] font-semibold text-lume">{p.off}% off</div>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BannerEditor({ banner, defaultPlacement, open, isDesktop, canDelete, onClose, onSaved, onDeleted }) {
  const initial = useMemo(() => toForm(banner, defaultPlacement), [banner, defaultPlacement]);
  const [f, setF] = useState(initial);
  const [ratio, setRatio] = useState(PLACEMENTS[initial.placement]?.ratio || "21/9");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [offer, setOffer] = useState("");
  const set = (p) => setF((s) => ({ ...s, ...p }));
  const dirty = FIELDS.some((k) => String(f[k] ?? "") !== String(initial[k] ?? ""));

  const save = async () => {
    if (!f.title.trim()) return toast.error("Title is required");
    if (f.ctaHref && !/^(\/|https?:\/\/)/.test(f.ctaHref.trim())) return toast.error("CTA link must start with / or https://");
    if (f.startsAt && f.endsAt && new Date(f.endsAt) <= new Date(f.startsAt)) return toast.error("End time must be after the start time");
    setBusy(true);
    try {
      const { product: _p, ...rest } = f;
      const body = {
        ...rest,
        productId: f.productId || null,
        startsAt: fromLocalInput(f.startsAt),
        endsAt: fromLocalInput(f.endsAt),
        sortOrder: f.sortOrder === "" ? undefined : Number(f.sortOrder),
      };
      const r = banner ? await api(`/api/admin/banners/${banner.id}`, { method: "PUT", body }) : await api("/api/admin/banners", { method: "POST", body });
      toast.success(banner ? "Banner saved" : "Banner created");
      onSaved(r.banner);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const writeCopy = async () => {
    setAiBusy(true);
    try {
      const r = await api("/api/admin/ai/banner-copy", {
        method: "POST",
        body: { productId: f.productId || null, discount: offer || null, placement: f.placement, current: { title: f.title, subtitle: f.subtitle, badge: f.badge } },
      });
      set({ title: r.title || f.title, subtitle: r.subtitle || f.subtitle, badge: r.badge || f.badge, ctaLabel: r.ctaLabel || f.ctaLabel });
      toast.success("Fresh copy written — review and save");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setAiBusy(false);
    }
  };

  const footer = (
    <>
      {banner && canDelete && (
        <ConfirmButton
          className="a-btn a-btn-ghost a-btn-sm mr-auto"
          title="Delete banner?"
          message={`“${banner.title}” and its image will be removed.`}
          confirmLabel="Delete"
          onConfirm={async () => {
            await api(`/api/admin/banners/${banner.id}`, { method: "DELETE" });
            toast.success("Banner deleted");
            onDeleted(banner.id);
          }}
        >
          <Trash2 /> Delete
        </ConfirmButton>
      )}
      {dirty && <Pill tone="gold">Unsaved</Pill>}
      <button className="a-btn a-btn-gold" onClick={save} disabled={busy || (!dirty && !!banner)}>
        {busy && <Spinner />} {banner ? "Save banner" : "Create banner"}
      </button>
    </>
  );

  return (
    <SplitEditor open={open} isDesktop={isDesktop} onClose={onClose} title={banner ? "Edit banner" : "New banner"} subtitle={PLACEMENTS[f.placement]?.hint} footer={footer} emptyText="Select a banner">
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="a-label !mb-0">Live preview</span>
            <div className="flex gap-1">
              {["16/9", "21/9"].map((r) => (
                <button key={r} type="button" onClick={() => setRatio(r)} className={cn("rounded-md border px-1.5 py-0.5 font-mono text-[10px]", ratio === r ? "border-gold bg-gold-3 text-gold-2" : "border-line text-mute hover:text-bone")}>
                  {r.replace("/", ":")}
                </button>
              ))}
            </div>
          </div>
          <BannerPreview b={f} ratio={ratio} />
        </div>

        <div>
          <span className="a-label">Colour theme</span>
          <ThemePicker value={f.theme} onChange={(theme) => set({ theme })} />
        </div>

        <div>
          <span className="a-label">Featured product</span>
          <ProductPicker product={f.product} onChange={(p) => set({ product: p, productId: p?.id || "" })} />
          <p className="a-hint">Shows the watch photo and price on the slide. Leave empty to use an uploaded image.</p>
        </div>

        <div className="rounded-xl border border-gold/25 bg-gold-3/60 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Offer for AI (optional)" className="min-w-[160px] flex-1">
              <input className="a-input" value={offer} maxLength={80} onChange={(e) => setOffer(e.target.value)} placeholder={f.product?.off ? `${f.product.off}% off` : "e.g. Up to 70% off, Diwali sale"} />
            </Field>
            <button type="button" className="a-btn a-btn-ai" onClick={writeCopy} disabled={aiBusy}>
              {aiBusy ? <Spinner /> : <Sparkles />} Write banner copy
            </button>
          </div>
          <p className="a-hint">Fills badge, title, subtitle and CTA from the featured product and offer. No authenticity or warranty claims.</p>
        </div>

        <Field label="Badge" hint="Big discount callout — the first number animates on the storefront." counter={f.badge.length} max={40}>
          <input className="a-input font-bold uppercase tracking-wide" value={f.badge} maxLength={40} onChange={(e) => set({ badge: e.target.value })} placeholder="UP TO 70% OFF" />
        </Field>
        <Field label="Title" hint="Line breaks are kept on the storefront." counter={f.title.length} max={140}>
          <textarea className="a-input min-h-[60px] py-2" rows={2} value={f.title} maxLength={140} onChange={(e) => set({ title: e.target.value })} placeholder="Festive Watch Fest" />
        </Field>
        <Field label="Subtitle" counter={f.subtitle.length} max={300}>
          <input className="a-input" value={f.subtitle} maxLength={300} onChange={(e) => set({ subtitle: e.target.value })} placeholder="Chronographs from ₹1,499 · Cash on Delivery" />
        </Field>
        <div className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-3">
          <Field label="CTA label">
            <input className="a-input" value={f.ctaLabel} maxLength={40} onChange={(e) => set({ ctaLabel: e.target.value })} placeholder="Shop now" />
          </Field>
          <Field label="CTA link" hint={f.product && !f.ctaHref ? "Empty → links to the featured product" : undefined}>
            <input className="a-input font-mono text-[12px]" value={f.ctaHref} onChange={(e) => set({ ctaHref: e.target.value })} placeholder={f.product?.slug ? `/watches/${f.product.slug}` : "/collections/sale"} />
          </Field>
        </div>

        <div>
          <span className="a-label">Image</span>
          <ImagePicker value={f.image} onChange={(url) => set({ image: url })} folder="banners" aspect={ratio === "16/9" ? "aspect-[16/9]" : "aspect-[21/9]"} label="Upload banner image (min 1600px wide)" />
        </div>

        <div>
          <span className="a-label flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" /> Schedule
          </span>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts" hint="Empty = immediately">
              <input type="datetime-local" className="a-input text-[12.5px]" value={f.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
            </Field>
            <Field label="Ends" hint="Empty = no end">
              <input type="datetime-local" className="a-input text-[12.5px]" value={f.endsAt} min={f.startsAt || undefined} onChange={(e) => set({ endsAt: e.target.value })} />
            </Field>
          </div>
          {(f.startsAt || f.endsAt) && (
            <button type="button" className="mt-1 text-[11.5px] text-gold-2 hover:underline" onClick={() => set({ startsAt: "", endsAt: "" })}>
              Clear schedule
            </button>
          )}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_100px] gap-3">
          <Field label="Placement">
            <select
              className="a-input"
              value={f.placement}
              onChange={(e) => {
                set({ placement: e.target.value });
                setRatio(PLACEMENTS[e.target.value]?.ratio || "21/9");
              }}
            >
              {Object.entries(PLACEMENTS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sort">
            <input className="a-input a-num" type="number" value={f.sortOrder} onChange={(e) => set({ sortOrder: e.target.value })} />
          </Field>
        </div>
        <Toggle checked={f.isActive} onChange={(v) => set({ isActive: v })} label="Active" hint="Inactive banners are kept but not shown." />
        <button type="submit" className="hidden" />
      </form>
    </SplitEditor>
  );
}

function HomepageCopy({ home, isAdmin }) {
  const router = useRouter();
  const [saved, setSaved] = useState(home);
  const [f, setF] = useState(home);
  const [busy, setBusy] = useState(false);
  const dirty = ["heroTitle", "heroSubtitle", "announcement"].some((k) => (f[k] || "") !== (saved[k] || ""));
  const set = (p) => setF((s) => ({ ...s, ...p }));

  const save = async () => {
    setBusy(true);
    try {
      const r = await api("/api/admin/settings", { method: "PUT", body: { key: "home", value: { heroTitle: f.heroTitle, heroSubtitle: f.heroSubtitle, announcement: f.announcement } } });
      setSaved(r.value);
      setF(r.value);
      toast.success("Homepage copy saved");
      router.refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      className="mt-6"
      title="Homepage copy"
      icon={Type}
      actions={
        <>
          <Link href="/admin/ai-studio?tab=copywriter" className="a-btn a-btn-ai a-btn-sm">
            <Sparkles /> Generate copy with AI <ArrowRight />
          </Link>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <fieldset disabled={!isAdmin} className="grid content-start gap-4">
          <Field label="Hero title" hint="Press Enter for a line break — the hero renders it on two lines." counter={(f.heroTitle || "").length} max={80}>
            <textarea className="a-input min-h-[76px] py-2 font-display text-[18px] leading-tight" rows={2} value={f.heroTitle || ""} onChange={(e) => set({ heroTitle: e.target.value })} />
          </Field>
          <Field label="Hero subtitle" counter={(f.heroSubtitle || "").length} max={160}>
            <textarea className="a-input min-h-[60px] py-2" rows={2} value={f.heroSubtitle || ""} onChange={(e) => set({ heroSubtitle: e.target.value })} />
          </Field>
          <Field label="Announcement bar" hint="Thin bar above the header. Leave empty to hide it. Use · to separate messages." counter={(f.announcement || "").length} max={120}>
            <input className="a-input" value={f.announcement || ""} onChange={(e) => set({ announcement: e.target.value })} />
          </Field>
          <div className="flex items-center justify-end gap-2">
            {!isAdmin && <span className="mr-auto text-[11.5px] text-mute">Only an ADMIN can change homepage copy.</span>}
            {dirty && <Pill tone="gold">Unsaved</Pill>}
            {dirty && (
              <button type="button" className="a-btn a-btn-ghost" onClick={() => setF(saved)}>
                Reset
              </button>
            )}
            <button type="button" className="a-btn a-btn-gold" onClick={save} disabled={busy || !dirty}>
              {busy && <Spinner />} Save copy
            </button>
          </div>
        </fieldset>

        <div>
          <span className="a-label">Preview</span>
          <div className="overflow-hidden rounded-xl border border-line bg-ink">
            {f.announcement && (
              <div className="flex items-center justify-center gap-2 border-b border-line bg-bone px-3 py-1.5 text-center text-[10.5px] tracking-wide text-white">
                <Megaphone className="h-3 w-3 flex-none" /> <span className="truncate">{f.announcement}</span>
              </div>
            )}
            <div className="relative bg-saffron px-6 py-10 text-white">
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/80">Premium Watches · India</div>
              <div className="mt-2 whitespace-pre-line font-sans text-[34px] font-extrabold leading-[0.95] tracking-tight text-white">{f.heroTitle || "Hero title"}</div>
              <p className="mt-3 max-w-sm text-[12px] text-white/85">{f.heroSubtitle}</p>
              <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-bone">
                Explore watches <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
