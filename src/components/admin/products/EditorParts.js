"use client";

import { ArrowDown, ArrowUp, Plus, Star, Trash2, Undo2, Check, Sparkles } from "lucide-react";
import { cn, formatINR, discountPct } from "@/lib/utils";

/** Inline "AI changed this" control shown beside a field label. */
export function AiMark({ active, onAccept, onUndo }) {
  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-widest text-gold-2">
        <Sparkles className="h-3 w-3" /> AI
      </span>
      <button type="button" onClick={onAccept} className="rounded p-0.5 text-lume hover:bg-lume/10" title="Accept" aria-label="Accept AI value">
        <Check className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onUndo} className="rounded p-0.5 text-mute hover:bg-ink-4 hover:text-bone" title="Undo" aria-label="Undo AI value">
        <Undo2 className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

/** Ordered list of short strings (highlights). */
export function ListEditor({ value = [], onChange, placeholder = "Add a highlight", max = 8, className }) {
  const set = (i, v) => onChange(value.map((x, j) => (j === i ? v : x)));
  const move = (i, d) => {
    const n = [...value];
    const [x] = n.splice(i, 1);
    n.splice(i + d, 0, x);
    onChange(n);
  };
  return (
    <div className={cn("space-y-1.5", className)}>
      {value.map((h, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="a-num w-5 text-center text-[11px] text-mute">{i + 1}</span>
          <input className="a-input a-input-sm flex-1" value={h} maxLength={120} onChange={(e) => set(i, e.target.value)} />
          <button type="button" className="a-btn a-btn-ghost a-btn-sm a-btn-icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
            <ArrowUp />
          </button>
          <button type="button" className="a-btn a-btn-ghost a-btn-sm a-btn-icon" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
            <ArrowDown />
          </button>
          <button type="button" className="a-btn a-btn-ghost a-btn-sm a-btn-icon hover:!text-danger" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove">
            <Trash2 />
          </button>
        </div>
      ))}
      {value.length < max && (
        <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={() => onChange([...value, ""])}>
          <Plus /> {placeholder}
        </button>
      )}
    </div>
  );
}

const SPEC_SUGGESTIONS = ["Calibre", "Power reserve", "Lug width", "Case thickness", "Bezel", "Clasp", "Crown", "Lume", "Battery", "Box contents", "Origin"];

/** Key/value rows for product.specs (Json). */
export function SpecsEditor({ value = [], onChange }) {
  const set = (i, k, v) => onChange(value.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const unused = SPEC_SUGGESTIONS.filter((s) => !value.some((r) => r.key.toLowerCase() === s.toLowerCase()));
  return (
    <div className="space-y-1.5">
      {value.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-1.5">
          <input className="a-input a-input-sm" placeholder="Label" value={r.key} onChange={(e) => set(i, "key", e.target.value)} />
          <input className="a-input a-input-sm" placeholder="Value" value={r.value} onChange={(e) => set(i, "value", e.target.value)} />
          <button type="button" className="a-btn a-btn-ghost a-btn-sm a-btn-icon hover:!text-danger" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove spec">
            <Trash2 />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-1">
        <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={() => onChange([...value, { key: "", value: "" }])}>
          <Plus /> Add spec
        </button>
        {unused.slice(0, 6).map((s) => (
          <button key={s} type="button" onClick={() => onChange([...value, { key: s, value: "" }])} className="rounded-md border border-dashed border-line-2 px-1.5 text-[11px] text-mute hover:border-gold hover:text-gold-2">
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Google search result preview. */
export function SerpPreview({ title, slug, desc, storeName = "PremiumShopy" }) {
  const t = title || "Product title";
  return (
    <div className="rounded-xl bg-white p-3.5 font-[arial,sans-serif] text-left">
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#f1f3f4] text-[11px] font-bold text-[#202124]">{storeName[0]}</span>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[12.5px] text-[#202124]">{storeName}</div>
          <div className="truncate text-[11.5px] text-[#4d5156]">https://premiumshopy.com › watches › {slug || "…"}</div>
        </div>
      </div>
      <div className="mt-1.5 line-clamp-1 text-[17px] leading-snug text-[#1a0dab]">{t.length > 60 ? t.slice(0, 58) + " …" : t}</div>
      <div className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-[#4d5156]">{desc || "Add a meta description so shoppers know why to click."}</div>
    </div>
  );
}

/** Storefront card preview (mirrors the shop look). */
export function ProductPreviewCard({ form, brandName }) {
  const img = form.images?.[0]?.url;
  const img2 = form.images?.[1]?.url;
  const off = discountPct(Number(form.price) || 0, Number(form.mrp) || 0);
  return (
    <div className="group overflow-hidden rounded-2xl border border-line bg-ink">
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-ink-3 to-ink">
        {img ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500 group-hover:opacity-0" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {img2 && <img src={img2} alt="" className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />}
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-xs text-mute">No image</div>
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {form.isNewArrival && <span className="rounded-full bg-bone px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white">New</span>}
          {off > 0 && <span className="rounded-full bg-ember px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white">−{off}%</span>}
        </div>
        {form.isBestSeller && <Star className="absolute right-2 top-2 h-4 w-4 fill-gold text-gold" />}
      </div>
      <div className="p-3">
        <div className="eyebrow !text-[9px]">{brandName || "Brand"}</div>
        <div className="mt-1 line-clamp-2 text-[13px] leading-snug">{form.name || "Product name"}</div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="a-num text-[14px]">{formatINR(form.price)}</span>
          {off > 0 && <span className="a-num text-[11.5px] text-mute line-through">{formatINR(form.mrp)}</span>}
        </div>
        <div className="mt-1 text-[11px] text-mute">
          {[form.movement, form.caseSize && `${form.caseSize}mm`, form.codAvailable && "COD"].filter(Boolean).join(" · ")}
        </div>
      </div>
    </div>
  );
}
