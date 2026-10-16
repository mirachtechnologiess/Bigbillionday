"use client";
import { useMemo, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { cn, formatINR } from "@/lib/utils";
import { DIAL_SWATCH, FACET_LABEL, MULTI_KEYS, PRICE_BANDS, SIZE_BANDS, splitList } from "./params";

function Group({ title, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between py-3 text-left">
        <span className="text-[12.5px] font-bold uppercase tracking-wide text-bone">
          {title}
          {count > 0 && <span className="ml-1.5 rounded-full bg-gold px-1.5 text-[10.5px] text-white">{count}</span>}
        </span>
        {open ? <Minus size={14} strokeWidth={1.3} className="text-mute" /> : <Plus size={14} strokeWidth={1.3} className="text-mute" />}
      </button>
      <div className={cn("grid transition-[grid-template-rows] duration-500 ease-lux", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="pb-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function CheckRow({ checked, onChange, label, count, swatch }) {
  return (
    <label className="group flex cursor-pointer items-center gap-3 py-[6px] text-[13.5px]">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
      <span
        aria-hidden
        className={cn(
          "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[4px] border-2 transition-colors duration-200 peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-gold",
          checked ? "border-gold bg-gold text-white" : "border-[#c4c8cf] bg-white group-hover:border-bone-2"
        )}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </span>
      {swatch && <span aria-hidden className="h-3.5 w-3.5 shrink-0 rounded-full border border-line-2" style={{ background: swatch }} />}
      <span className={cn("flex-1 truncate transition-colors", checked ? "font-semibold text-bone" : "text-bone-2 group-hover:text-bone")}>{label}</span>
      {count != null && <span className="text-[11.5px] text-mute">({count})</span>}
    </label>
  );
}

function FacetList({ fkey, options, selected, onToggle }) {
  const [all, setAll] = useState(false);
  const [filter, setFilter] = useState("");
  const long = options.length > 8;
  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const list = f ? options.filter((o) => o.label.toLowerCase().includes(f)) : options;
    if (all || f || !long) return list;
    // keep selected values visible even when collapsed
    const head = list.slice(0, 7);
    const extra = list.slice(7).filter((o) => selected.includes(o.value));
    return [...head, ...extra];
  }, [options, filter, all, long, selected]);

  return (
    <div>
      {options.length > 12 && (
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={`Find ${FACET_LABEL[fkey]?.toLowerCase() || ""}`}
          className="mb-2 h-9 w-full rounded-md border border-line-2 bg-white px-3 text-[13px] outline-none placeholder:text-mute focus:border-gold"
          aria-label={`Filter ${FACET_LABEL[fkey]} options`}
        />
      )}
      <div className={cn(all && long && "max-h-72 overflow-y-auto pr-1")} data-lenis-prevent>
        {shown.map((o) => (
          <CheckRow
            key={o.value}
            checked={selected.includes(o.value)}
            onChange={() => onToggle(fkey, o.value)}
            label={o.label}
            count={o.count}
            swatch={fkey === "dialColor" ? DIAL_SWATCH[o.value] : undefined}
          />
        ))}
      </div>
      {long && !filter && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-1 text-[12.5px] font-bold text-gold-2 hover:underline">
          {all ? "Show less" : `+ ${options.length - 7} more`}
        </button>
      )}
    </div>
  );
}

function PriceGroup({ params, setMany, range }) {
  const [min, setMin] = useState(params.min || "");
  const [max, setMax] = useState(params.max || "");
  const apply = (e) => {
    e.preventDefault();
    setMany({ min: min ? String(Math.max(0, Math.floor(Number(min)))) : null, max: max ? String(Math.max(0, Math.floor(Number(max)))) : null });
  };
  return (
    <div>
      <div className="flex flex-col items-start gap-0.5">
        {PRICE_BANDS.map(([lo, hi, label]) => {
          const active = String(params.min || "") === String(lo ?? "") && String(params.max || "") === String(hi ?? "");
          return (
            <button
              key={label}
              type="button"
              data-active={active}
              className={cn("rounded px-1 py-1 text-left text-[13.5px] hover:text-gold-2", active ? "font-bold text-gold-2" : "text-bone-2")}
              onClick={() => {
                const next = active ? { min: null, max: null } : { min: lo ? String(lo) : null, max: hi ? String(hi) : null };
                setMin(next.min || "");
                setMax(next.max || "");
                setMany(next);
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <form onSubmit={apply} className="mt-3 flex items-center gap-2">
        <label className="sr-only" htmlFor="price-min">
          Minimum price
        </label>
        <input
          id="price-min"
          inputMode="numeric"
          value={min}
          onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))}
          placeholder={range?.min ? formatINR(range.min) : "Min"}
          className="h-9 w-full min-w-0 rounded-md border border-line-2 bg-white px-2.5 text-[13px] outline-none placeholder:text-mute focus:border-gold"
        />
        <span className="text-mute">–</span>
        <label className="sr-only" htmlFor="price-max">
          Maximum price
        </label>
        <input
          id="price-max"
          inputMode="numeric"
          value={max}
          onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))}
          placeholder={range?.max ? formatINR(range.max) : "Max"}
          className="h-9 w-full min-w-0 rounded-md border border-line-2 bg-white px-2.5 text-[13px] outline-none placeholder:text-mute focus:border-gold"
        />
        <button type="submit" className="h-9 shrink-0 rounded-md bg-gold px-3.5 text-[13px] font-bold text-white hover:bg-gold-2">
          Go
        </button>
      </form>
    </div>
  );
}

function Toggle({ on, label, onClick }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} className="flex w-full items-center justify-between py-2 text-[14px]">
      <span className={on ? "font-semibold text-bone" : "text-bone-2"}>{label}</span>
      <span className={cn("relative h-5 w-9 rounded-full border transition-colors duration-300", on ? "border-lume bg-lume" : "border-line-2 bg-ink-3")}>
        <span className={cn("absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full transition-all duration-500 ease-lux", on ? "left-[19px] bg-white" : "left-[3px] bg-white shadow")} />
      </span>
    </button>
  );
}

/** Filter body (used in the desktop sidebar and the mobile bottom sheet). */
export default function FilterPanel({ facets, params, hide = [], onToggle, setMany }) {
  const groups = MULTI_KEYS.filter((k) => !hide.includes(k) && facets?.[k]?.length > 0);
  return (
    <div>
      <div className="border-b border-line py-2">
        <Toggle on={params.inStock === "1"} label="In stock only" onClick={() => setMany({ inStock: params.inStock === "1" ? null : "1" })} />
        <Toggle on={params.sale === "1"} label="On sale" onClick={() => setMany({ sale: params.sale === "1" ? null : "1" })} />
        {!hide.includes("new") && <Toggle on={params.new === "1"} label="New arrivals" onClick={() => setMany({ new: params.new === "1" ? null : "1" })} />}
      </div>
      <Group title="Price" count={params.min || params.max ? 1 : 0} defaultOpen>
        <PriceGroup key={`${params.min}-${params.max}`} params={params} setMany={setMany} range={facets?.price} />
      </Group>
      {groups.map((k, i) => {
        const selected = splitList(params[k]);
        return (
          <Group key={k} title={FACET_LABEL[k]} count={selected.length} defaultOpen={i < 2 || selected.length > 0}>
            <FacetList fkey={k} options={facets[k]} selected={selected} onToggle={onToggle} />
          </Group>
        );
      })}
      <Group title="Case size" count={params.size ? 1 : 0}>
        <div className="flex flex-wrap gap-2">
          {SIZE_BANDS.map(([v, label]) => (
            <button key={v} type="button" data-active={params.size === v} className="chip hover:border-gold" onClick={() => setMany({ size: params.size === v ? null : v })}>
              {label}
            </button>
          ))}
        </div>
      </Group>
    </div>
  );
}
