"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, Copy, Eye, Languages, Loader2, Plus, Save, ScanSearch, Sparkles, Tag, Wand2, Wand, IndianRupee, Boxes, Layers, Search, Image as ImageIcon, Type, Cog, Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatINR, slugify, discountPct, WATCH_ATTRS, GENDER_LABEL } from "@/lib/utils";
import { api } from "../fetcher";
import { Card, ConfirmButton, Field, Pill, TagInput, Toggle, Spinner } from "../ui";
import ImageUploader from "./ImageUploader";
import { AiMark, ListEditor, ProductPreviewCard, SerpPreview, SpecsEditor } from "./EditorParts";

const FEATURE_SUGGESTIONS = [
  "Chronograph", "Date", "Day-Date", "Luminous hands", "Tachymeter", "Rotating bezel", "GMT", "Moon phase", "Skeleton dial",
  "Screw-down crown", "Heart-rate", "SpO2", "Bluetooth calling", "Notifications", "Step counter", "Alarm", "Stopwatch", "Backlight",
];
const ATTR_LABEL = {
  movement: "Movement", display: "Display", caseMaterial: "Case material", caseShape: "Case shape",
  strapMaterial: "Strap material", glass: "Glass", waterResistance: "Water resistance", dialColor: "Dial colour",
};
const STRING_FIELDS = new Set(["name", "shortDescription", "description", "seoTitle", "seoDesc", "modelNumber", "strapColor", "slug"]);

const EMPTY = {
  name: "", slug: "", sku: "", modelNumber: "", brandId: "", brandName: "", categoryId: "", gender: "MEN",
  shortDescription: "", description: "", highlights: [], price: "", mrp: "", costPrice: "", stock: 1, lowStockAt: 3,
  status: "DRAFT", isFeatured: false, isNewArrival: true, isBestSeller: false, codAvailable: true,
  movement: "", caseMaterial: "", caseSize: "", caseShape: "", dialColor: "", strapMaterial: "", strapColor: "",
  waterResistance: "", glass: "", display: "", features: [], warranty: "1 year seller warranty", weightGrams: "",
  specs: [], tags: [], seoTitle: "", seoDesc: "", aiGenerated: false, images: [], collectionIds: [],
};

function fromProduct(p) {
  if (!p) return { ...EMPTY };
  const out = { ...EMPTY };
  for (const k of Object.keys(EMPTY)) if (p[k] !== undefined && p[k] !== null) out[k] = p[k];
  out.brandId = p.brandId || "";
  out.brandName = "";
  out.categoryId = p.categoryId || "";
  out.specs = p.specs && typeof p.specs === "object" ? Object.entries(p.specs).map(([key, value]) => ({ key, value: String(value) })) : [];
  out.images = (p.images || []).map(({ url, alt, width, height, blurData }) => ({ url, alt: alt || "", width, height, blurData }));
  out.collectionIds = (p.collections || []).map((c) => c.collectionId);
  for (const k of ["costPrice", "caseSize", "weightGrams"]) out[k] = p[k] ?? "";
  return out;
}

const isEmptyVal = (v) => v === "" || v === null || v === undefined || (Array.isArray(v) && v.length === 0);

export default function ProductEditor({ product, meta, storeName, aiOn, isAdmin }) {
  const router = useRouter();
  const isNew = !product;
  const [form, setForm] = useState(() => fromProduct(product));
  const [baseline, setBaseline] = useState(() => JSON.stringify(fromProduct(product)));
  const [brands, setBrands] = useState(meta.brands);
  const [brandMode, setBrandMode] = useState(meta.brands.length ? "existing" : "new");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(null);
  const [aiPrev, setAiPrev] = useState({}); // key -> previous value (for undo)
  const [typing, setTyping] = useState(new Set());
  const [aiInfo, setAiInfo] = useState(null);
  const [aiAltKeys, setAiAltKeys] = useState(new Set());
  const [autoRun, setAutoRun] = useState(true);
  const [onlyEmpty, setOnlyEmpty] = useState(!isNew);
  const [hint, setHint] = useState("");
  const [descTab, setDescTab] = useState("write");
  const [tone, setTone] = useState("premium");
  const timers = useRef([]);
  const formRef = useRef(form);
  formRef.current = form;

  useEffect(() => {
    try {
      const v = localStorage.getItem("adm-ai-autorun");
      if (v !== null) setAutoRun(v === "1");
    } catch {}
    const list = timers.current;
    return () => list.forEach(clearInterval);
  }, []);

  const dirty = useMemo(() => JSON.stringify(form) !== baseline, [form, baseline]);
  useEffect(() => {
    const h = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const brandName = brandMode === "new" ? form.brandName : brands.find((b) => b.id === form.brandId)?.name || "";

  /* ───────── field helpers ───────── */
  const set = useCallback((key, value) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "name" && !slugTouched) next.slug = slugify(`${value}`);
      return next;
    });
    // manual edit = accept the AI value
    setAiPrev((p) => {
      if (!(key in p)) return p;
      const n = { ...p };
      delete n[key];
      return n;
    });
  }, [slugTouched]);

  const typeInto = (key, text) => {
    const full = String(text);
    const total = full.length;
    const steps = Math.min(70, Math.max(12, Math.round(total / 6)));
    let i = 0;
    setTyping((s) => new Set(s).add(key));
    const t = setInterval(() => {
      i++;
      const cut = i >= steps ? full : full.slice(0, Math.round((total * i) / steps));
      setForm((f) => ({ ...f, [key]: cut }));
      if (i >= steps) {
        clearInterval(t);
        setTyping((s) => {
          const n = new Set(s);
          n.delete(key);
          return n;
        });
      }
    }, 18);
    timers.current.push(t);
  };

  /** Apply AI values with highlight + undo memory + typing animation for text. */
  const applyAi = (patch, { respectEmpty = onlyEmpty } = {}) => {
    const cur = formRef.current;
    const prev = {};
    let delay = 0;
    let changed = 0;
    for (const [key, value] of Object.entries(patch)) {
      if (isEmptyVal(value)) continue;
      if (respectEmpty && !isEmptyVal(cur[key]) && !(key === "slug" && !slugTouched)) continue;
      if (JSON.stringify(cur[key]) === JSON.stringify(value)) continue;
      if (key === "slug" && slugTouched) continue;
      prev[key] = cur[key];
      changed++;
      if (STRING_FIELDS.has(key) && typeof value === "string") {
        const d = delay;
        setTimeout(() => typeInto(key, value), d);
        delay += 120;
      } else {
        setForm((f) => ({ ...f, [key]: value }));
      }
    }
    if (changed) {
      setAiPrev((p) => ({ ...prev, ...p }));
      setForm((f) => ({ ...f, aiGenerated: true }));
    }
    return changed;
  };

  const accept = (key) =>
    setAiPrev((p) => {
      const n = { ...p };
      delete n[key];
      return n;
    });
  const undo = (key) => {
    setForm((f) => ({ ...f, [key]: aiPrev[key] }));
    accept(key);
  };
  const acceptAll = () => setAiPrev({});
  const undoAll = () => {
    setForm((f) => ({ ...f, ...aiPrev }));
    setAiPrev({});
  };
  const mark = (key) => <AiMark active={key in aiPrev} onAccept={() => accept(key)} onUndo={() => undo(key)} />;
  const glow = (key) => (key in aiPrev || typing.has(key) ? "ai-touched" : "");

  /* ───────── AI: photo → listing ───────── */
  const runAutofill = async (imgs = formRef.current.images) => {
    if (!aiOn) return toast.error("AI is offline — set NVIDIA_API_KEY");
    if (!imgs.length) return toast.error("Upload a photo first");
    setAiBusy("fill");
    const tid = toast.loading("Reading the watch… (vision model)");
    try {
      const r = await api("/api/admin/ai/product-from-image", {
        method: "POST",
        body: { imageUrl: imgs[0].url, imageCount: imgs.length, hint },
      });
      toast.loading("Writing the listing…", { id: tid });
      const { altTexts = [], priceBand, ...fields } = r.fields;
      delete fields.aiGenerated;
      const patch = {};
      for (const [k, v] of Object.entries(fields)) if (k in EMPTY) patch[k] = v ?? "";
      if (patch.caseSize === null) delete patch.caseSize;
      // brand
      if (r.brand?.match) {
        setBrandMode("existing");
        if (!onlyEmpty || !formRef.current.brandId) patch.brandId = r.brand.match.id;
      }
      const n = applyAi(patch);
      // alt texts → only empty alts
      if (altTexts.length) {
        const keys = new Set();
        setForm((f) => ({
          ...f,
          images: f.images.map((im, i) => {
            if (!im.alt && altTexts[i]) {
              keys.add(im.url);
              return { ...im, alt: altTexts[i] };
            }
            return im;
          }),
        }));
        setAiAltKeys(keys);
      }
      setAiInfo({ brand: r.brand, priceBand, meta: r.meta });
      toast.success(`AI filled ${n} field${n === 1 ? "" : "s"} · confidence ${Math.round((r.meta?.confidence || 0) * 100)}%`, { id: tid });
    } catch (e) {
      toast.error(e.message, { id: tid });
    } finally {
      setAiBusy(null);
    }
  };

  const onUploaded = (added, all) => {
    const f = formRef.current;
    const looksEmpty = !f.name && !f.description;
    if (autoRun && aiOn && all.length === added.length && looksEmpty) runAutofill(all);
  };

  /* ───────── AI: per-field tools ───────── */
  const productPayload = () => {
    const f = formRef.current;
    return {
      ...f,
      brandName,
      price: Number(f.price) || null,
      caseSize: Number(f.caseSize) || null,
      specs: undefined,
      images: undefined,
    };
  };

  const fieldAi = async (task, extra = {}) => {
    if (!aiOn) return toast.error("AI is offline — set NVIDIA_API_KEY");
    if (!formRef.current.name && task !== "alt") return toast.error("Add a product name (or run Auto-fill) first");
    setAiBusy(task);
    try {
      const r = await api("/api/admin/ai/product-field", {
        method: "POST",
        body: { task, product: productPayload(), imageUrls: task === "alt" ? formRef.current.images.map((i) => i.url) : [], ...extra },
      });
      if (task === "seo") applyAi({ seoTitle: r.seoTitle, seoDesc: r.seoDesc, ...(formRef.current.shortDescription ? {} : { shortDescription: r.shortDescription }) }, { respectEmpty: false });
      else if (task === "tags") applyAi({ tags: r.tags }, { respectEmpty: false });
      else if (task === "description") applyAi({ description: r.description, highlights: r.highlights }, { respectEmpty: false });
      else if (task === "highlights") applyAi({ highlights: r.highlights }, { respectEmpty: false });
      else if (task === "translate") {
        const base = (formRef.current.description || "").replace(/<h3>(தமிழில் விவரம்|हिंदी में विवरण)<\/h3>[\s\S]*?(?=<h3>|$)/g, "");
        applyAi({ description: `${base}${r.html}` }, { respectEmpty: false });
        setDescTab("preview");
      } else if (task === "alt") {
        const keys = new Set();
        setForm((f) => ({
          ...f,
          images: f.images.map((im, i) => {
            if (r.alts?.[i]) {
              keys.add(im.url);
              return { ...im, alt: r.alts[i] };
            }
            return im;
          }),
        }));
        setAiAltKeys(keys);
      }
      toast.success("AI suggestion applied — review the highlighted fields");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setAiBusy(null);
    }
  };

  /* ───────── misc actions ───────── */
  const genSku = async () => {
    try {
      const r = await api(`/api/admin/products/sku?brand=${encodeURIComponent(brandName || "GEN")}`);
      set("sku", r.sku);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const createDetectedBrand = (name) => {
    setBrandMode("new");
    setForm((f) => ({ ...f, brandId: "", brandName: name }));
    toast.message(`Brand “${name}” will be created when you save`);
  };

  const save = async (overrides = {}) => {
    const f = { ...formRef.current, ...overrides };
    if (!f.name.trim()) return toast.error("Product name is required");
    if (!(Number(f.price) > 0)) return toast.error("Selling price is required");
    if (brandMode === "existing" && !f.brandId) return toast.error("Choose a brand");
    if (brandMode === "new" && !f.brandName.trim()) return toast.error("Enter the new brand name");
    if (f.status === "ACTIVE" && !f.images.length) return toast.error("Add at least one photo before publishing");
    setSaving(true);
    const body = {
      ...f,
      brandId: brandMode === "existing" ? f.brandId : null,
      brandName: brandMode === "new" ? f.brandName.trim() : brandName,
      categoryId: f.categoryId || null,
      price: Number(f.price),
      mrp: Number(f.mrp) || Number(f.price),
      costPrice: f.costPrice === "" ? null : Number(f.costPrice),
      caseSize: f.caseSize === "" ? null : Number(f.caseSize),
      weightGrams: f.weightGrams === "" ? null : Number(f.weightGrams),
      stock: Number(f.stock) || 0,
      lowStockAt: Number(f.lowStockAt) || 0,
      highlights: f.highlights.filter((h) => h.trim()),
      specs: f.specs.filter((s) => s.key.trim() && String(s.value).trim()),
    };
    try {
      const r = await api(isNew ? "/api/admin/products" : `/api/admin/products/${product.id}`, { method: isNew ? "POST" : "PUT", body });
      const saved = { ...f, slug: r.product.slug, sku: r.product.sku, brandId: r.product.brandId, brandName: "" };
      if (brandMode === "new") {
        setBrands((b) => [...b, { id: r.product.brandId, name: body.brandName }].sort((a, c) => a.name.localeCompare(c.name)));
        setBrandMode("existing");
      }
      setForm(saved);
      setBaseline(JSON.stringify(saved));
      setAiPrev({});
      setAiAltKeys(new Set());
      setSlugTouched(true);
      toast.success(isNew ? "Product created" : "Saved");
      if (isNew) router.replace(`/admin/products/${r.product.id}`);
      else router.refresh();
    } catch (e) {
      const issues = e.data?.issues;
      if (issues) {
        const [k, v] = Object.entries(issues)[0] || [];
        toast.error(k ? `${k}: ${v?.[0]}` : e.message);
      } else toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Ctrl/Cmd+S
  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving) save();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const duplicate = async () => {
    try {
      const r = await api(`/api/admin/products/${product.id}/duplicate`, { method: "POST" });
      toast.success("Duplicated as draft");
      router.push(`/admin/products/${r.product.id}`);
    } catch (e) {
      toast.error(e.message);
    }
  };
  const remove = async () => {
    const r = await api(`/api/admin/products/${product.id}`, { method: "DELETE" });
    toast.success(r.message || "Deleted");
    setBaseline(JSON.stringify(formRef.current));
    router.push("/admin/products");
  };

  /* ───────── derived ───────── */
  const price = Number(form.price) || 0;
  const mrp = Number(form.mrp) || 0;
  const cost = Number(form.costPrice) || 0;
  const discount = discountPct(price, mrp);
  const margin = cost && price ? Math.round(((price - cost) / price) * 100) : null;
  const aiCount = Object.keys(aiPrev).length;
  const catLabel = (c) => {
    const parent = meta.categories.find((x) => x.id === c.parentId);
    return parent ? `${parent.name} › ${c.name}` : c.name;
  };
  const busy = (t) => aiBusy === t;
  const AiBtn = ({ task, children, extra, icon: Icon = Sparkles, className }) => (
    <button type="button" className={cn("a-btn a-btn-ai a-btn-sm", className)} disabled={!!aiBusy || !aiOn} onClick={() => fieldAi(task, extra)} title={aiOn ? undefined : "AI offline"}>
      {busy(task) ? <Spinner /> : <Icon />} {children}
    </button>
  );

  return (
    <div className="pb-24">
      {/* sticky top bar */}
      <div className="sticky top-14 z-30 -mx-3 mb-5 border-b border-line bg-ink/80 px-3 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-2">
          <Link href="/admin/products" className="a-btn a-btn-ghost a-btn-sm a-btn-icon" aria-label="Back to products">
            <ArrowLeft />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[22px] leading-none sm:text-[26px]">{form.name || (isNew ? "New product" : "Untitled")}</div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-mute">
              <span className="font-mono">{form.sku || "SKU auto"}</span>
              {form.aiGenerated && <Pill tone="gold" className="!h-[18px] !text-[10px]">AI assisted</Pill>}
              <AnimatePresence>
                {dirty && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-gold-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Unsaved
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
          {aiCount > 0 && (
            <div className="hidden items-center gap-1 rounded-xl border border-gold/30 bg-gold/5 px-2 py-1 md:flex">
              <span className="text-[11.5px] text-gold-2"><span className="a-num">{aiCount}</span> AI changes</span>
              <button className="a-btn a-btn-ghost a-btn-sm" onClick={acceptAll}>Accept all</button>
              <button className="a-btn a-btn-ghost a-btn-sm" onClick={undoAll}>Undo all</button>
            </div>
          )}
          {!isNew && form.status === "ACTIVE" && (
            <a href={`/watches/${form.slug}`} target="_blank" rel="noreferrer" className="a-btn a-btn-ghost a-btn-sm hidden sm:inline-flex">
              <Eye /> View
            </a>
          )}
          {form.status !== "ACTIVE" && (
            <button className="a-btn a-btn-sm hidden sm:inline-flex" disabled={saving} onClick={() => save({ status: "ACTIVE" })}>
              <Rocket /> Save & publish
            </button>
          )}
          <button className="a-btn a-btn-gold" disabled={saving} onClick={() => save()} title="Save (Ctrl+S)">
            {saving ? <Spinner /> : <Save />} <span className="hidden sm:inline">Save</span>
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ══════════ MAIN ══════════ */}
        <div className="min-w-0 space-y-5">
          <Card
            title="Photos"
            icon={ImageIcon}
            actions={
              form.images.length > 0 && (
                <AiBtn task="alt" icon={ScanSearch}>Alt text</AiBtn>
              )
            }
          >
            <ImageUploader images={form.images} onChange={(imgs) => setForm((f) => ({ ...f, images: imgs }))} onUploaded={onUploaded} analysing={busy("fill")} aiAltKeys={aiAltKeys} />

            {/* AI auto-fill console */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-gold/25 bg-[linear-gradient(120deg,rgba(242,96,12,.08),rgba(255,194,26,.06)_60%,transparent)]">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[13.5px] font-semibold">
                    <Sparkles className="h-4 w-4 text-gold" /> Auto-fill with AI
                  </div>
                  <p className="mt-0.5 text-[12px] text-mute">
                    Reads the cover photo, identifies brand, movement, case, dial & strap, then writes the name, description, highlights, tags and SEO. Every change is highlighted so you can accept or undo it.
                  </p>
                </div>
                <button type="button" className="a-btn a-btn-gold !h-10 flex-none" disabled={!!aiBusy || !form.images.length || !aiOn} onClick={() => runAutofill()}>
                  {busy("fill") ? <Loader2 className="animate-spin" /> : <Wand2 />} {busy("fill") ? "Analysing…" : "✦ Auto-fill"}
                </button>
              </div>
              <div className="grid gap-3 border-t border-gold/15 px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <input className="a-input a-input-sm" placeholder="Optional hint for AI, e.g. “Fossil Grant, 44mm, gift box included”" value={hint} onChange={(e) => setHint(e.target.value)} maxLength={300} />
                <Toggle
                  checked={autoRun}
                  onChange={(v) => {
                    setAutoRun(v);
                    try {
                      localStorage.setItem("adm-ai-autorun", v ? "1" : "0");
                    } catch {}
                  }}
                  label={<span className="text-[12px]">Auto-run on upload</span>}
                />
                <Toggle checked={onlyEmpty} onChange={setOnlyEmpty} label={<span className="text-[12px]">Only fill empty fields</span>} />
              </div>
              {!aiOn && <div className="border-t border-gold/15 px-4 py-2 text-[12px] text-ember">AI is offline: NVIDIA_API_KEY is not configured on the server.</div>}
              <AnimatePresence>
                {aiInfo && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-gold/15">
                    <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-[12px]">
                      <span className="text-mute">Detected:</span>
                      {aiInfo.brand?.detected ? (
                        aiInfo.brand.match ? (
                          <Pill tone="lume">Brand · {aiInfo.brand.match.name}</Pill>
                        ) : (
                          <>
                            <Pill tone="gold">“{aiInfo.brand.detected}” — not in catalog</Pill>
                            <button className="a-btn a-btn-sm" onClick={() => createDetectedBrand(aiInfo.brand.detected)}>
                              <Plus /> Create brand {aiInfo.brand.detected}
                            </button>
                          </>
                        )
                      ) : (
                        <Pill tone="mute">Brand not legible — choose manually</Pill>
                      )}
                      {aiInfo.meta?.model && <Pill tone="info" dot={false}>Model guess · {aiInfo.meta.model}</Pill>}
                      {aiInfo.meta?.style && <Pill tone="mute" dot={false}>{aiInfo.meta.style}</Pill>}
                      <Pill tone={(aiInfo.meta?.confidence || 0) >= 0.7 ? "lume" : (aiInfo.meta?.confidence || 0) >= 0.4 ? "gold" : "ember"}>
                        <span className="a-num">{Math.round((aiInfo.meta?.confidence || 0) * 100)}%</span> confidence
                      </Pill>
                      {aiInfo.meta?.visibleText?.length > 0 && <span className="text-mute">Dial text: “{aiInfo.meta.visibleText.join(" · ")}”</span>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>

          <Card title="Basics" icon={Type}>
            <div className="grid gap-4">
              <Field label="Product name" counter={form.name.length} max={110} right={mark("name")}>
                <input className={cn("a-input !h-10 !text-[14px]", glow("name"), typing.has("name") && "ai-caret")} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Fossil Grant Chronograph Blue Dial Leather Strap Watch for Men" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Brand"
                  right={
                    <span className="flex items-center gap-2">
                      {mark("brandId")}
                      <button type="button" className="text-[11px] text-gold-2 hover:underline" onClick={() => setBrandMode((m) => (m === "new" ? "existing" : "new"))}>
                        {brandMode === "new" ? "Pick existing" : "+ New brand"}
                      </button>
                    </span>
                  }
                >
                  {brandMode === "existing" ? (
                    <select className={cn("a-input", glow("brandId"))} value={form.brandId} onChange={(e) => set("brandId", e.target.value)}>
                      <option value="">Select brand…</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input className="a-input" value={form.brandName} onChange={(e) => set("brandName", e.target.value)} placeholder="New brand name (created on save)" />
                  )}
                </Field>
                <Field label="Model number" right={mark("modelNumber")}>
                  <input className={cn("a-input font-mono", glow("modelNumber"))} value={form.modelNumber} onChange={(e) => set("modelNumber", e.target.value)} placeholder="e.g. FS5061" />
                </Field>
                <Field label="Gender" right={mark("gender")}>
                  <div className={cn("grid grid-cols-4 gap-1 rounded-xl border border-line bg-ink-2 p-1", glow("gender"))}>
                    {Object.entries(GENDER_LABEL).map(([k, l]) => (
                      <button key={k} type="button" onClick={() => set("gender", k)} className={cn("h-7 rounded-lg text-[12px] transition-colors", form.gender === k ? "bg-bone text-white" : "text-bone-2 hover:bg-ink-4")}>
                        {l}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Category">
                  <select className="a-input" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                    <option value="">No category</option>
                    {meta.categories.map((c) => (
                      <option key={c.id} value={c.id}>{catLabel(c)}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Short description" counter={form.shortDescription.length} max={160} right={mark("shortDescription")} hint="Shown under the title and in product cards.">
                <textarea rows={2} className={cn("a-input !min-h-0", glow("shortDescription"), typing.has("shortDescription") && "ai-caret")} value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card
            title="Description"
            icon={Wand}
            actions={
              <div className="flex flex-wrap items-center gap-1.5">
                <select className="a-input a-input-sm !w-28" value={tone} onChange={(e) => setTone(e.target.value)} aria-label="Tone">
                  <option value="premium">Premium</option>
                  <option value="minimal">Minimal</option>
                  <option value="technical">Technical</option>
                  <option value="playful">Playful</option>
                  <option value="festive">Festive</option>
                </select>
                <AiBtn task="description" extra={{ tone }} icon={Wand2}>Rewrite</AiBtn>
                <AiBtn task="translate" extra={{ lang: "Tamil" }} icon={Languages} className="!hidden sm:!inline-flex">தமிழ்</AiBtn>
                <AiBtn task="translate" extra={{ lang: "Hindi" }} icon={Languages} className="!hidden sm:!inline-flex">हिंदी</AiBtn>
              </div>
            }
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex gap-1 rounded-lg border border-line p-0.5">
                {["write", "preview"].map((t) => (
                  <button key={t} type="button" onClick={() => setDescTab(t)} className={cn("h-6 rounded-md px-2.5 text-[11.5px] capitalize", descTab === t ? "bg-ink-4 text-bone" : "text-mute")}>
                    {t === "write" ? "HTML" : "Preview"}
                  </button>
                ))}
              </div>
              <span className="flex items-center gap-2">
                {mark("description")}
                <span className="a-num text-[10.5px] text-mute">{(form.description || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length} words</span>
              </span>
            </div>
            {descTab === "write" ? (
              <textarea
                rows={10}
                className={cn("a-input font-mono !text-[12px]", glow("description"), typing.has("description") && "ai-caret")}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="<p>…</p><ul><li>…</li></ul>  — allowed tags: p, ul, li, strong"
              />
            ) : (
              <div className={cn("prose-lux max-h-[420px] overflow-y-auto rounded-xl border border-line bg-ink p-4 !text-[13.5px]", glow("description"))} dangerouslySetInnerHTML={{ __html: form.description || "<p style='opacity:.5'>Nothing yet.</p>" }} />
            )}
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="a-label !mb-0">Highlights</span>
                <span className="flex items-center gap-2">
                  {mark("highlights")}
                  <AiBtn task="highlights">Generate</AiBtn>
                </span>
              </div>
              <div className={cn("rounded-xl p-0.5", glow("highlights"))}>
                <ListEditor value={form.highlights} onChange={(v) => set("highlights", v)} max={8} />
              </div>
            </div>
          </Card>

          <Card title="Watch specifications" icon={Cog}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.keys(WATCH_ATTRS).map((k) => {
                const opts = WATCH_ATTRS[k];
                const val = form[k] || "";
                return (
                  <Field key={k} label={ATTR_LABEL[k] || k} right={mark(k)}>
                    <select className={cn("a-input", glow(k))} value={val} onChange={(e) => set(k, e.target.value)}>
                      <option value="">—</option>
                      {val && !opts.includes(val) && <option value={val}>{val}</option>}
                      {opts.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                );
              })}
              <Field label="Case size (mm)" right={mark("caseSize")}>
                <input type="number" min={10} max={70} className={cn("a-input a-num", glow("caseSize"))} value={form.caseSize} onChange={(e) => set("caseSize", e.target.value)} />
              </Field>
              <Field label="Strap colour" right={mark("strapColor")}>
                <input className={cn("a-input", glow("strapColor"))} value={form.strapColor} onChange={(e) => set("strapColor", e.target.value)} placeholder="e.g. Brown" />
              </Field>
              <Field label="Weight (g)">
                <input type="number" min={0} className="a-input a-num" value={form.weightGrams} onChange={(e) => set("weightGrams", e.target.value)} />
              </Field>
              <Field label="Warranty" className="sm:col-span-2 lg:col-span-1">
                <input className="a-input" value={form.warranty} onChange={(e) => set("warranty", e.target.value)} placeholder="e.g. 1 year seller warranty" />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Features" right={mark("features")}>
                <div className={cn("rounded-xl", glow("features"))}>
                  <TagInput value={form.features} onChange={(v) => set("features", v)} suggestions={FEATURE_SUGGESTIONS} placeholder="Chronograph, Date, Luminous hands…" />
                </div>
              </Field>
            </div>
            <div className="mt-4">
              <span className="a-label">Additional specs</span>
              <SpecsEditor value={form.specs} onChange={(v) => set("specs", v)} />
            </div>
          </Card>

          <Card
            title="Search engine listing"
            icon={Search}
            actions={
              <div className="flex gap-1.5">
                <AiBtn task="seo">Generate SEO</AiBtn>
                <AiBtn task="tags" icon={Tag}>Tags</AiBtn>
              </div>
            }
          >
            <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
              <div className="space-y-4">
                <Field label="URL slug" hint={`/watches/${form.slug || "…"}`}>
                  <div className="flex gap-1.5">
                    <input
                      className={cn("a-input font-mono !text-[12px]", glow("slug"))}
                      value={form.slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        set("slug", slugify(e.target.value));
                      }}
                    />
                    <button type="button" className="a-btn a-btn-sm a-btn-ghost !h-9" onClick={() => { setSlugTouched(false); set("slug", slugify(`${form.name}`)); }} title="Regenerate from name">
                      ↺
                    </button>
                  </div>
                </Field>
                <Field label="SEO title" counter={form.seoTitle.length} max={60} right={mark("seoTitle")}>
                  <input className={cn("a-input", glow("seoTitle"), typing.has("seoTitle") && "ai-caret")} value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} placeholder={form.name} />
                </Field>
                <Field label="Meta description" counter={form.seoDesc.length} max={155} right={mark("seoDesc")}>
                  <textarea rows={3} className={cn("a-input !min-h-0", glow("seoDesc"), typing.has("seoDesc") && "ai-caret")} value={form.seoDesc} onChange={(e) => set("seoDesc", e.target.value)} />
                </Field>
                <Field label={`Tags (${form.tags.length})`} right={mark("tags")} hint="Used by on-site search and related products.">
                  <div className={cn("rounded-xl", glow("tags"))}>
                    <TagInput value={form.tags} onChange={(v) => set("tags", v.map((t) => t.toLowerCase()))} placeholder="blue dial watch, gift for husband…" max={30} />
                  </div>
                </Field>
              </div>
              <div>
                <span className="a-label">Google preview</span>
                <SerpPreview title={form.seoTitle || form.name} slug={form.slug} desc={form.seoDesc || form.shortDescription} storeName={storeName} />
              </div>
            </div>
          </Card>
        </div>

        {/* ══════════ SIDE ══════════ */}
        <div className="space-y-5 xl:sticky xl:top-[124px] xl:max-h-[calc(100dvh-140px)] xl:overflow-y-auto xl:pb-4 xl:pr-1">
          <Card title="Status" icon={Rocket}>
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-ink-2 p-1">
              {[
                ["DRAFT", "Draft", "bg-gold text-white"],
                ["ACTIVE", "Active", "bg-lume text-white"],
                ["ARCHIVED", "Archived", "bg-ink-4 text-bone"],
              ].map(([v, l, on]) => (
                <button key={v} type="button" onClick={() => set("status", v)} className={cn("h-8 rounded-lg text-[12px] font-semibold transition-colors", form.status === v ? on : "text-mute hover:text-bone")}>
                  {l}
                </button>
              ))}
            </div>
            <p className="a-hint mt-2">{form.status === "ACTIVE" ? "Visible in the store." : form.status === "DRAFT" ? "Hidden — only admins can see it." : "Hidden and removed from listings."}</p>
            {!isNew && (
              <div className="mt-3 flex gap-1.5 border-t border-line pt-3">
                <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={duplicate}>
                  <Copy /> Duplicate
                </button>
                {isAdmin && (
                  <ConfirmButton className="a-btn a-btn-ghost a-btn-sm hover:!text-danger" title="Delete this product?" message="Products with orders are archived instead." confirmLabel="Delete" onConfirm={remove}>
                    Delete
                  </ConfirmButton>
                )}
              </div>
            )}
          </Card>

          <Card title="Pricing" icon={IndianRupee}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Selling price ₹">
                <input type="number" min={1} className="a-input a-num !h-10 !text-[15px]" value={form.price} onChange={(e) => set("price", e.target.value)} />
              </Field>
              <Field label="MRP ₹">
                <input type="number" min={0} className="a-input a-num !h-10" value={form.mrp} onChange={(e) => set("mrp", e.target.value)} placeholder={form.price} />
              </Field>
              <Field label="Cost ₹" hint="Private — for margin">
                <input type="number" min={0} className="a-input a-num" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} />
              </Field>
              <div className="rounded-xl border border-line bg-ink-2 p-2.5 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-mute">Discount</span>
                  <span className={cn("a-num", discount ? "text-ember" : "text-mute")}>{discount}%</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-mute">Margin</span>
                  <span className={cn("a-num", margin === null ? "text-mute" : margin < 15 ? "text-ember" : "text-lume")}>{margin === null ? "—" : `${margin}%`}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-mute">Profit</span>
                  <span className="a-num">{cost && price ? formatINR(price - cost) : "—"}</span>
                </div>
              </div>
            </div>
            {mrp > 0 && price > mrp && <p className="mt-2 text-[11.5px] text-ember">MRP is lower than price — it will be raised to the selling price on save.</p>}
            {aiInfo?.priceBand && (
              <div className="mt-3 rounded-xl border border-dashed border-gold/40 bg-gold/5 p-2.5 text-[12px]">
                <div className="flex items-center gap-1.5 text-gold-2">
                  <Sparkles className="h-3.5 w-3.5" /> AI price hint (not applied)
                </div>
                <div className="a-num mt-1 text-[14px]">
                  {formatINR(aiInfo.priceBand.min)} – {formatINR(aiInfo.priceBand.max)}
                </div>
                {aiInfo.priceBand.note && <div className="mt-0.5 text-mute">{aiInfo.priceBand.note}</div>}
                <div className="mt-2 flex gap-1.5">
                  <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={() => set("price", aiInfo.priceBand.min)}>Use low as price</button>
                  <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={() => set("mrp", aiInfo.priceBand.max)}>Use high as MRP</button>
                </div>
              </div>
            )}
          </Card>

          <Card title="Inventory" icon={Boxes}>
            <div className="space-y-3">
              <Field label="SKU" hint="Leave blank to auto-generate (PS-BRA-####)">
                <div className="flex gap-1.5">
                  <input className="a-input font-mono !text-[12.5px] uppercase" value={form.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} placeholder="PS-XXX-0000" />
                  <button type="button" className="a-btn a-btn-sm !h-9" onClick={genSku}>Generate</button>
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Stock">
                  <div className="flex">
                    <button type="button" className="a-btn a-btn-icon !rounded-r-none" onClick={() => set("stock", Math.max(0, Number(form.stock) - 1))} aria-label="Decrease stock">−</button>
                    <input type="number" min={0} className="a-input a-num !rounded-none text-center" value={form.stock} onChange={(e) => set("stock", e.target.value)} />
                    <button type="button" className="a-btn a-btn-icon !rounded-l-none" onClick={() => set("stock", Number(form.stock) + 1)} aria-label="Increase stock">+</button>
                  </div>
                </Field>
                <Field label="Low-stock alert at">
                  <input type="number" min={0} className="a-input a-num" value={form.lowStockAt} onChange={(e) => set("lowStockAt", e.target.value)} />
                </Field>
              </div>
              <Toggle checked={form.codAvailable} onChange={(v) => set("codAvailable", v)} label="Cash on Delivery available" />
            </div>
          </Card>

          <Card title="Merchandising" icon={Layers}>
            <div className="space-y-2.5">
              <Toggle checked={form.isFeatured} onChange={(v) => set("isFeatured", v)} label="Featured" hint="Pinned on the homepage & top of listings" />
              <Toggle checked={form.isNewArrival} onChange={(v) => set("isNewArrival", v)} label="New arrival" />
              <Toggle checked={form.isBestSeller} onChange={(v) => set("isBestSeller", v)} label="Bestseller badge" />
            </div>
            {meta.collections.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <span className="a-label">Collections</span>
                <div className="flex flex-wrap gap-1.5">
                  {meta.collections.map((c) => {
                    const on = form.collectionIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className="chip !h-7"
                        data-active={on}
                        onClick={() => set("collectionIds", on ? form.collectionIds.filter((x) => x !== c.id) : [...form.collectionIds, c.id])}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          <div>
            <span className="a-label">Storefront preview</span>
            <div className="mx-auto max-w-[260px]">
              <ProductPreviewCard form={form} brandName={brandName} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
