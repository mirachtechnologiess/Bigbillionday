"use client";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownUp, Check, LoaderCircle, SlidersHorizontal, X } from "lucide-react";
import { cn, formatINR } from "@/lib/utils";
import FilterPanel from "./FilterPanel";
import { FILTER_KEYS, MULTI_KEYS, PRICE_BANDS, SIZE_BANDS, SORT_OPTIONS, activeFilterCount, buildHref, splitList } from "./params";
import { useScrollLock, useEscape } from "@/components/layout/useScrollLock";

const EASE = [0.22, 1, 0.36, 1];

function chipLabel(key, value, facets, params) {
  if (MULTI_KEYS.includes(key)) return facets?.[key]?.find((o) => o.value === value)?.label || value;
  if (key === "q") return `“${value}”`;
  if (key === "size") return SIZE_BANDS.find(([v]) => v === value)?.[1] || `${value} mm`;
  if (key === "inStock") return "In stock";
  if (key === "sale") return "On sale";
  if (key === "new") return "New";
  if (key === "min" || key === "max") {
    const band = PRICE_BANDS.find(([lo, hi]) => String(lo ?? "") === String(params.min || "") && String(hi ?? "") === String(params.max || ""));
    if (band) return band[2];
    return key === "min" ? `From ${formatINR(value)}` : `Up to ${formatINR(value)}`;
  }
  return value;
}

function Sheet({ label, onClose, children, footer }) {
  return (
    <motion.div key={label} className="fixed inset-0 z-[70] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button type="button" aria-label={`Close ${label.toLowerCase()}`} onClick={onClose} className="absolute inset-0 bg-bone/45" />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-lenis-prevent
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.35, ease: EASE }}
        className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-2xl bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
          <p className="text-[16px] font-bold text-bone">{label}</p>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-ink-2" aria-label={`Close ${label.toLowerCase()}`}>
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4">{children}</div>
        {footer}
      </motion.div>
    </motion.div>
  );
}

/**
 * Client wrapper around a server-rendered results grid.
 * params: user-controllable URL params (fixed route params excluded). Filters update the URL via router.replace in a transition.
 */
export default function ListingShell({ basePath, params: serverParams, facets, total, hide = [], defaultSort = "featured", children }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [params, setParams] = useState(serverParams);
  const [sheet, setSheet] = useState(null); // "filter" | "sort" | null
  const serverKey = JSON.stringify(serverParams);

  // re-sync optimistic state when the server responds
  useEffect(() => {
    setParams(JSON.parse(serverKey));
  }, [serverKey]);

  useScrollLock(!!sheet);
  const closeSheet = useCallback(() => setSheet(null), []);
  useEscape(!!sheet, closeSheet);

  const navigate = useCallback(
    (next) => {
      setParams(next);
      startTransition(() => {
        router.replace(buildHref(basePath, next), { scroll: false });
      });
    },
    [basePath, router]
  );

  const setMany = useCallback(
    (patch) => {
      const next = { ...params, ...patch };
      for (const k of Object.keys(next)) if (next[k] == null || next[k] === "") delete next[k];
      delete next.page;
      navigate(next);
    },
    [params, navigate]
  );

  const onToggle = useCallback(
    (key, value) => {
      const cur = splitList(params[key]);
      const list = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      setMany({ [key]: list.join(",") || null });
    },
    [params, setMany]
  );

  const clearAll = () => {
    const next = {};
    if (params.sort) next.sort = params.sort;
    navigate(next);
  };

  const chips = [];
  const isBand = PRICE_BANDS.some(([lo, hi]) => String(lo ?? "") === String(params.min || "") && String(hi ?? "") === String(params.max || ""));
  for (const k of FILTER_KEYS) {
    if (!params[k]) continue;
    if (MULTI_KEYS.includes(k)) {
      splitList(params[k]).forEach((v) => chips.push({ k, v, remove: () => onToggle(k, v) }));
    } else if (k === "max" && isBand && params.min) {
      continue; // band shown once via the "min" chip
    } else {
      const patch = (k === "min" || k === "max") && isBand ? { min: null, max: null } : { [k]: null };
      chips.push({ k, v: params[k], remove: () => setMany(patch) });
    }
  }
  const nActive = activeFilterCount(params);
  const sort = params.sort || defaultSort;
  const setSort = (v) => setMany({ sort: v === defaultSort ? null : v });
  const sortLabel = SORT_OPTIONS.find(([v]) => v === sort)?.[1] || "Relevance";
  const count = (
    <>
      <strong className="font-bold text-bone">{total.toLocaleString("en-IN")}</strong> {total === 1 ? "item" : "items"}
    </>
  );

  return (
    <div className="lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-5 xl:grid-cols-[270px_minmax(0,1fr)]">
      {/* desktop sidebar */}
      <aside className="hidden lg:block" aria-label="Filters">
        <div
          className="sticky top-[calc(var(--header-h)+12px)] max-h-[calc(100dvh-var(--header-h)-24px)] overflow-y-auto rounded-xl border border-line bg-white px-4 pb-4"
          data-lenis-prevent
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white py-3.5">
            <p className="text-[16px] font-bold text-bone">Filters</p>
            {nActive > 0 && (
              <button type="button" onClick={clearAll} className="text-[12.5px] font-bold uppercase text-gold-2 hover:underline">
                Clear all
              </button>
            )}
          </div>
          <FilterPanel facets={facets} params={params} hide={hide} onToggle={onToggle} setMany={setMany} />
        </div>
      </aside>

      <div className="min-w-0">
        {/* toolbar */}
        <div className="mb-3 rounded-xl border border-line bg-white px-3 py-2.5 sm:px-4 lg:sticky lg:top-[calc(var(--header-h)+12px)] lg:z-30 lg:mb-4">
          <div className="flex items-center justify-between gap-3">
            <p className="flex shrink-0 items-center gap-2 text-[13px] text-bone-2" aria-live="polite">
              {pending && <LoaderCircle size={14} className="animate-spin text-gold" />}
              <span>{count}</span>
            </p>
            {/* sort tabs (tablet / desktop) */}
            <div className="hidden min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] md:flex" role="radiogroup" aria-label="Sort by">
              <span className="mr-1 shrink-0 text-[13px] font-semibold text-bone">Sort by</span>
              {SORT_OPTIONS.map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={sort === v}
                  onClick={() => setSort(v)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-[12.5px] font-semibold transition-colors",
                    sort === v ? "bg-gold text-white" : "text-bone-2 hover:bg-ink-2 hover:text-bone"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <span className="text-[12px] text-mute md:hidden">Sorted by {sortLabel}</span>
          </div>

          {chips.length > 0 && (
            <ul className="mt-2.5 flex gap-2 overflow-x-auto border-t border-line pt-2.5 [scrollbar-width:none] lg:flex-wrap">
              {chips.map((c) => (
                <li key={`${c.k}:${c.v}`} className="shrink-0">
                  <button
                    type="button"
                    onClick={c.remove}
                    className="chip h-7 border-gold/40 bg-gold-3 font-semibold text-gold-2 hover:border-gold"
                    aria-label={`Remove filter ${chipLabel(c.k, c.v, facets, params)}`}
                  >
                    {chipLabel(c.k, c.v, facets, params)}
                    <X size={12} strokeWidth={2.2} />
                  </button>
                </li>
              ))}
              <li className="shrink-0">
                <button type="button" onClick={clearAll} className="chip h-7 border-transparent font-semibold text-mute hover:text-gold-2">
                  Clear all
                </button>
              </li>
            </ul>
          )}
        </div>

        <div className={cn("transition-opacity duration-300", pending && "pointer-events-none opacity-50")} aria-busy={pending}>
          {children}
        </div>
      </div>

      {/* mobile sticky sort / filter bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-line bg-white shadow-[0_-6px_20px_-10px_rgba(17,24,39,0.25)] pb-[env(safe-area-inset-bottom)] lg:hidden">
        <button type="button" onClick={() => setSheet("sort")} className="flex h-12 items-center justify-center gap-2 border-r border-line text-[14px] font-bold text-bone">
          <ArrowDownUp size={17} /> Sort
        </button>
        <button type="button" onClick={() => setSheet("filter")} className="flex h-12 items-center justify-center gap-2 text-[14px] font-bold text-bone">
          <SlidersHorizontal size={17} /> Filter
          {nActive > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] text-white">{nActive}</span>}
        </button>
      </div>
      <div aria-hidden className="h-14 lg:hidden" />

      <AnimatePresence>
        {sheet === "sort" && (
          <Sheet label="Sort by" onClose={closeSheet}>
            <ul className="py-2" role="radiogroup" aria-label="Sort by">
              {SORT_OPTIONS.map(([v, l]) => (
                <li key={v}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={sort === v}
                    onClick={() => {
                      setSort(v);
                      closeSheet();
                    }}
                    className={cn("flex w-full items-center justify-between py-3.5 text-[15px]", sort === v ? "font-bold text-gold-2" : "text-bone")}
                  >
                    {l}
                    {sort === v && <Check size={18} />}
                  </button>
                </li>
              ))}
            </ul>
          </Sheet>
        )}
        {sheet === "filter" && (
          <Sheet
            label="Filters"
            onClose={closeSheet}
            footer={
              <div className="flex shrink-0 gap-3 border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button type="button" onClick={clearAll} className="btn btn-ghost btn-sm h-11 flex-1 rounded-lg" disabled={!nActive}>
                  Clear all
                </button>
                <button type="button" onClick={closeSheet} className="btn btn-gold btn-sm h-11 flex-[2] rounded-lg">
                  {pending ? <LoaderCircle size={15} className="animate-spin" /> : `Show ${total.toLocaleString("en-IN")} results`}
                </button>
              </div>
            }
          >
            <FilterPanel facets={facets} params={params} hide={hide} onToggle={onToggle} setMany={setMany} />
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  );
}
