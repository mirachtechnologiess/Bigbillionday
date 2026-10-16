"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, ExternalLink, ImagePlus, Pause, Play, RotateCcw, Rocket, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { Card, Field, Pill, Spinner } from "../ui";
import { api, uploadImage } from "../fetcher";
import { cn } from "@/lib/utils";

const STATUS = {
  queued: { label: "Queued", tone: "mute" },
  uploading: { label: "Uploading", tone: "info" },
  analysing: { label: "Analysing", tone: "gold" },
  creating: { label: "Creating draft", tone: "gold" },
  done: { label: "Draft ready", tone: "lume" },
  published: { label: "Published", tone: "lume" },
  error: { label: "Failed", tone: "danger" },
};
const BUSY = new Set(["uploading", "analysing", "creating"]);
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/avif"];

let seq = 0;

export default function PhotoDrafts({ aiOn }) {
  const [items, setItems] = useState([]);
  const itemsRef = useRef([]);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const runningRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [drag, setDrag] = useState(false);
  const [opts, setOpts] = useState({ stock: 0, price: "", hint: "" });
  const optsRef = useRef(opts);
  const [publishing, setPublishing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    optsRef.current = opts;
  }, [opts]);

  // revoke object URLs on unmount
  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.preview)), []);

  const commit = (next) => {
    itemsRef.current = next;
    setItems(next);
  };
  const patch = (id, p) => commit(itemsRef.current.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const processOne = async (item) => {
    const o = optsRef.current;
    patch(item.id, { status: "uploading", error: null });
    const img = item.image || (await uploadImage(item.file, "products"));
    patch(item.id, { image: img, status: "analysing" });
    const ai = item.ai || (await api("/api/admin/ai/product-from-image", { method: "POST", body: { imageUrl: img.url, imageCount: 1, hint: o.hint || undefined } }));
    const f = ai.fields || {};
    patch(item.id, { ai, status: "creating", name: f.name, brand: ai.brand?.match?.name || ai.brand?.detected || "Unbranded" });
    const { altTexts, priceBand, slug: _slug, ...rest } = f;
    const override = parseInt(o.price, 10);
    const price = override > 0 ? override : priceBand?.min || 999;
    const mrp = override > 0 ? Math.max(override, priceBand?.max || 0) : priceBand?.max || price;
    const body = {
      ...rest,
      brandId: ai.brand?.match?.id || undefined,
      brandName: ai.brand?.match ? undefined : ai.brand?.detected || "Unbranded",
      price,
      mrp,
      stock: Math.max(0, parseInt(o.stock, 10) || 0),
      status: "DRAFT",
      aiGenerated: true,
      images: [{ url: img.url, width: img.width, height: img.height, blurData: img.blurData, alt: altTexts?.[0] || null }],
    };
    const r = await api("/api/admin/products", { method: "POST", body });
    patch(item.id, { status: "done", productId: r.product?.id, name: r.product?.name || f.name, selected: true });
  };

  const run = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    try {
      for (;;) {
        if (pausedRef.current) break;
        const next = itemsRef.current.find((i) => i.status === "queued");
        if (!next) break;
        try {
          await processOne(next);
        } catch (e) {
          patch(next.id, { status: "error", error: e.message || "Failed" });
          if (e.status === 503) {
            toast.error(e.message);
            pausedRef.current = true;
            setPaused(true);
          } else if (e.status === 429) {
            toast.message("Rate limited. Pausing for a minute is wise; queue paused.");
            pausedRef.current = true;
            setPaused(true);
          }
        }
      }
    } finally {
      runningRef.current = false;
      setRunning(false);
      const list = itemsRef.current;
      if (!pausedRef.current && list.length && !list.some((i) => i.status === "queued")) {
        const done = list.filter((i) => i.status === "done").length;
        const failed = list.filter((i) => i.status === "error").length;
        if (done || failed) toast.success(`Queue finished: ${done} draft${done === 1 ? "" : "s"}${failed ? `, ${failed} failed` : ""}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []).filter((f) => ACCEPT.includes(f.type));
    if (!files.length) return toast.error("Drop JPG, PNG, WebP or AVIF photos");
    const tooBig = files.filter((f) => f.size > 10 * 1024 * 1024);
    if (tooBig.length) toast.error(`${tooBig.length} file(s) over 10MB skipped`);
    const fresh = files
      .filter((f) => f.size <= 10 * 1024 * 1024)
      .map((file) => ({ id: `p${++seq}`, file, preview: URL.createObjectURL(file), status: "queued", selected: false }));
    commit([...itemsRef.current, ...fresh]);
    if (!pausedRef.current) run();
  };

  const togglePause = () => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    if (!next) run();
  };

  const retryFailed = () => {
    commit(itemsRef.current.map((i) => (i.status === "error" ? { ...i, status: "queued", error: null } : i)));
    if (!pausedRef.current) run();
  };

  const remove = (id) => {
    const it = itemsRef.current.find((i) => i.id === id);
    if (it) URL.revokeObjectURL(it.preview);
    commit(itemsRef.current.filter((i) => i.id !== id));
  };

  const clearFinished = () => {
    itemsRef.current.filter((i) => ["done", "published"].includes(i.status)).forEach((i) => URL.revokeObjectURL(i.preview));
    commit(itemsRef.current.filter((i) => !["done", "published"].includes(i.status)));
  };

  const doneItems = items.filter((i) => i.status === "done");
  const selected = doneItems.filter((i) => i.selected);
  const allSelected = doneItems.length > 0 && selected.length === doneItems.length;

  const publish = async () => {
    if (!selected.length) return;
    setPublishing(true);
    try {
      const ids = selected.map((i) => i.productId).filter(Boolean);
      const r = await api("/api/admin/products/bulk", { method: "POST", body: { ids, action: "publish" } });
      commit(itemsRef.current.map((i) => (ids.includes(i.productId) ? { ...i, status: "published", selected: false } : i)));
      toast.success(`Published ${r?.count ?? ids.length} product${ids.length === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setPublishing(false);
    }
  };

  const counts = items.reduce((a, i) => ({ ...a, [i.status]: (a[i.status] || 0) + 1 }), {});
  const finished = (counts.done || 0) + (counts.published || 0) + (counts.error || 0);
  const pct = items.length ? Math.round((finished / items.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card title="Batch settings" bodyClass="grid gap-3 sm:grid-cols-[120px_160px_1fr]">
        <Field label="Default stock">
          <input type="number" min={0} className="a-input" value={opts.stock} onChange={(e) => setOpts({ ...opts, stock: e.target.value })} />
        </Field>
        <Field label="Price override ₹" hint="Blank = AI price band">
          <input type="number" min={1} className="a-input" placeholder="auto" value={opts.price} onChange={(e) => setOpts({ ...opts, price: e.target.value })} />
        </Field>
        <Field label="Hint for the AI" hint="e.g. all are Casio G-Shock, men's, ₹6-9k range">
          <input className="a-input" maxLength={300} placeholder="Optional context applied to every photo" value={opts.hint} onChange={(e) => setOpts({ ...opts, hint: e.target.value })} />
        </Field>
      </Card>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        className={cn(
          "a-dots flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors",
          drag ? "border-gold bg-gold/5" : "border-line-2 hover:border-gold/60",
          !aiOn && "pointer-events-none opacity-50"
        )}
      >
        <div className="grid h-12 w-12 place-items-center rounded-full border border-line-2 bg-ink-3">
          <UploadCloud className="h-5 w-5 text-gold" />
        </div>
        <div className="font-display text-2xl">Drop watch photos here</div>
        <p className="max-w-md text-[12.5px] text-mute">One product per photo. Each is uploaded, read by the vision model, and saved as a draft with name, specs, copy and SEO.</p>
        <span className="a-btn a-btn-sm mt-1">
          <ImagePlus /> Choose photos
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT.join(",")}
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <Card
          title={
            <span className="flex items-center gap-2">
              Queue <span className="a-num text-[11px] text-mute">{finished}/{items.length}</span>
              {running && !paused && <Spinner className="text-gold" />}
            </span>
          }
          actions={
            <>
              <button className="a-btn a-btn-sm" onClick={togglePause}>
                {paused ? <Play /> : <Pause />} {paused ? "Resume" : "Pause"}
              </button>
              {counts.error > 0 && (
                <button className="a-btn a-btn-sm" onClick={retryFailed}>
                  <RotateCcw /> Retry {counts.error}
                </button>
              )}
              {(counts.done || counts.published) > 0 && (
                <button className="a-btn a-btn-sm a-btn-ghost" onClick={clearFinished}>
                  <Trash2 /> Clear finished
                </button>
              )}
            </>
          }
        >
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-ink-4">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-gold-3 via-gold to-lume" animate={{ width: `${pct}%` }} transition={{ ease: "easeOut" }} />
          </div>

          {doneItems.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-ink-3/50 p-2.5">
              <label className="flex items-center gap-2 text-[12.5px]">
                <input
                  type="checkbox"
                  className="a-check"
                  checked={allSelected}
                  onChange={() => commit(itemsRef.current.map((i) => (i.status === "done" ? { ...i, selected: !allSelected } : i)))}
                />
                {selected.length} of {doneItems.length} drafts selected
              </label>
              <div className="ml-auto flex gap-2">
                <Link href="/admin/products?status=DRAFT" className="a-btn a-btn-sm a-btn-ghost">
                  <ExternalLink /> All drafts
                </Link>
                <button className="a-btn a-btn-gold a-btn-sm" disabled={!selected.length || publishing} onClick={publish}>
                  {publishing ? <Spinner /> : <Rocket />} Publish selected
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <AnimatePresence initial={false}>
              {items.map((it) => {
                const st = STATUS[it.status];
                return (
                  <motion.div
                    key={it.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    className={cn("group overflow-hidden rounded-xl border bg-ink-3/60", it.selected ? "border-gold/60" : "border-line")}
                  >
                    <div className={cn("relative aspect-square bg-ink-4", it.status === "analysing" && "a-scan")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.preview} alt="" className={cn("h-full w-full object-cover transition", BUSY.has(it.status) && "opacity-70", it.status === "queued" && "opacity-50 grayscale")} />
                      <div className="absolute left-2 top-2">
                        <Pill tone={st.tone}>
                          {BUSY.has(it.status) && <Spinner className="!h-3 !w-3" />}
                          {st.label}
                        </Pill>
                      </div>
                      {it.status === "done" && (
                        <input
                          type="checkbox"
                          className="a-check absolute right-2 top-2"
                          checked={!!it.selected}
                          onChange={() => patch(it.id, { selected: !it.selected })}
                          aria-label="Select draft"
                        />
                      )}
                      {(it.status === "queued" || it.status === "error") && (
                        <button className="a-btn a-btn-sm a-btn-icon absolute right-2 top-2 opacity-0 group-hover:opacity-100" onClick={() => remove(it.id)} aria-label="Remove">
                          <X />
                        </button>
                      )}
                    </div>
                    <div className="space-y-1 p-2.5">
                      <div className="truncate font-mono text-[10.5px] uppercase tracking-wider text-gold-3">{it.brand || it.file.name}</div>
                      <div className="line-clamp-2 min-h-[2.5em] text-[12px] leading-tight text-bone">{it.name || (it.status === "error" ? "" : "Waiting for the model…")}</div>
                      {it.status === "error" && (
                        <div className="flex items-start gap-1 text-[11px] text-danger" title={it.error}>
                          <AlertCircle className="mt-0.5 h-3 w-3 flex-none" />
                          <span className="line-clamp-2">{it.error}</span>
                        </div>
                      )}
                      {it.productId && (
                        <Link href={`/admin/products/${it.productId}`} className="inline-flex items-center gap-1 text-[11.5px] text-gold-2 hover:underline">
                          {it.status === "published" ? <Check className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />} Open in editor
                        </Link>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </Card>
      )}
    </div>
  );
}
