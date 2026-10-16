"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive, Copy, Eye, FileEdit, ImageOff, Percent, Rocket, Sparkles, Star, StarOff, Trash2, Watch, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatINR } from "@/lib/utils";
import { api } from "../fetcher";
import {
  ConfirmButton, Empty, Modal, Pagination, Pill, ProductStatusPill, SearchInput, Spinner, StockPill, Tabs, timeAgo, useQueryState,
} from "../ui";

/* Inline number editor: click → input, Enter saves, Esc cancels */
function InlineNumber({ value, onSave, format = (v) => v, className, min = 0 }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);
  const save = async () => {
    const n = Math.round(Number(v));
    if (!Number.isFinite(n) || n < min) {
      toast.error("Enter a valid number");
      return;
    }
    if (n === value) return setEditing(false);
    setBusy(true);
    try {
      await onSave(n);
      setEditing(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  if (editing)
    return (
      <span className="inline-flex items-center gap-1">
        <input
          ref={ref}
          type="number"
          min={min}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setV(value);
              setEditing(false);
            }
          }}
          onBlur={save}
          className="a-input a-input-sm a-num w-24"
          disabled={busy}
        />
        {busy && <Spinner className="text-mute" />}
      </span>
    );
  return (
    <button type="button" onClick={() => setEditing(true)} className={cn("a-num rounded-md px-1.5 py-0.5 text-left decoration-dotted underline-offset-4 hover:bg-ink-4 hover:underline", className)} title="Click to edit">
      {format(value)}
    </button>
  );
}

function Thumb({ src, name }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} className="h-11 w-11 flex-none rounded-lg border border-line bg-ink-3 object-cover" loading="lazy" />
  ) : (
    <span className="grid h-11 w-11 flex-none place-items-center rounded-lg border border-dashed border-line-2 bg-ink-3">
      <ImageOff className="h-4 w-4 text-mute" />
    </span>
  );
}

export default function ProductsTable({ data, brands, counts, isAdmin, aiOn }) {
  const router = useRouter();
  const { sp, set, pending } = useQueryState();
  const [items, setItems] = useState(data.items);
  const [sel, setSel] = useState(new Set());
  const [busy, setBusy] = useState(null);
  const [priceModal, setPriceModal] = useState(false);
  const [pct, setPct] = useState(-10);
  const [round, setRound] = useState("9");

  useEffect(() => {
    setItems(data.items);
    setSel(new Set());
  }, [data.items]);

  const allSel = items.length > 0 && items.every((p) => sel.has(p.id));
  const toggleAll = () => setSel(allSel ? new Set() : new Set(items.map((p) => p.id)));
  const toggle = (id) =>
    setSel((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const patch = async (id, body) => {
    const r = await api(`/api/admin/products/${id}`, { method: "PATCH", body });
    setItems((list) => list.map((p) => (p.id === id ? { ...p, ...r.product } : p)));
    toast.success("Saved");
  };

  const bulk = async (action, extra = {}) => {
    const ids = [...sel];
    if (!ids.length) return;
    setBusy(action);
    try {
      if (action === "seo") {
        let done = 0;
        const tid = toast.loading(`Writing SEO… 0/${ids.length}`);
        for (let i = 0; i < ids.length; i += 5) {
          const r = await api("/api/admin/products/bulk", { method: "POST", body: { ids: ids.slice(i, i + 5), action } });
          done += r.count;
          toast.loading(`Writing SEO… ${Math.min(i + 5, ids.length)}/${ids.length}`, { id: tid });
        }
        toast.success(`SEO generated for ${done} product${done === 1 ? "" : "s"}`, { id: tid });
      } else {
        const r = await api("/api/admin/products/bulk", { method: "POST", body: { ids, action, ...extra } });
        toast.success(r.message || `Updated ${r.count} product${r.count === 1 ? "" : "s"}`);
      }
      setSel(new Set());
      router.refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const duplicate = async (id) => {
    try {
      const r = await api(`/api/admin/products/${id}/duplicate`, { method: "POST" });
      toast.success("Duplicated as draft");
      router.push(`/admin/products/${r.product.id}`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const remove = async (id) => {
    const r = await api(`/api/admin/products/${id}`, { method: "DELETE" });
    toast.success(r.message || "Deleted");
    router.refresh();
  };

  const status = sp.get("status") || "";
  const margin = (p) => (p.costPrice ? Math.round(((p.price - p.costPrice) / p.price) * 100) : null);

  return (
    <div className={cn("transition-opacity", pending && "opacity-60")}>
      <Tabs
        className="mb-3"
        value={status}
        onChange={(v) => set({ status: v })}
        tabs={[
          { value: "", label: "All", count: counts.ALL || 0 },
          { value: "ACTIVE", label: "Active", count: counts.ACTIVE || 0 },
          { value: "DRAFT", label: "Drafts", count: counts.DRAFT || 0 },
          { value: "ARCHIVED", label: "Archived", count: counts.ARCHIVED || 0 },
        ]}
      />

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-[minmax(220px,1fr)_auto_auto_auto_auto]">
        <SearchInput placeholder="Name, SKU, model, brand, tag…" className="col-span-2 md:col-span-1" />
        <select className="a-input md:w-40" value={sp.get("brand") || ""} onChange={(e) => set({ brand: e.target.value })} aria-label="Brand">
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select className="a-input md:w-36" value={sp.get("stock") || ""} onChange={(e) => set({ stock: e.target.value })} aria-label="Stock">
          <option value="">Any stock</option>
          <option value="in">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <select className="a-input md:w-40" value={sp.get("flag") || ""} onChange={(e) => set({ flag: e.target.value })} aria-label="Flag">
          <option value="">All products</option>
          <option value="featured">Featured</option>
          <option value="ai">AI generated</option>
          <option value="noimage">Missing image</option>
          <option value="noseo">Missing SEO</option>
        </select>
        <select className="a-input md:w-40" value={sp.get("sort") || "updated"} onChange={(e) => set({ sort: e.target.value })} aria-label="Sort">
          <option value="updated">Recently updated</option>
          <option value="newest">Newest</option>
          <option value="name-asc">Name A–Z</option>
          <option value="price-asc">Price ↑</option>
          <option value="price-desc">Price ↓</option>
          <option value="stock-asc">Stock ↑</option>
          <option value="stock-desc">Stock ↓</option>
          <option value="bestselling">Best selling</option>
          <option value="views">Most viewed</option>
        </select>
      </div>

      {items.length === 0 ? (
        <Empty
          icon={Watch}
          title="No products match"
          action={
            <Link href="/admin/products/new" className="a-btn a-btn-gold">
              Create a product
            </Link>
          }
        >
          Try clearing filters — or drop a photo into the editor and let AI build the listing.
        </Empty>
      ) : (
        <>
          {/* Desktop table */}
          <div className="a-table-wrap hidden md:block">
            <table className="a-table">
              <thead>
                <tr>
                  <th className="w-8">
                    <input type="checkbox" className="a-check" checked={allSel} onChange={toggleAll} aria-label="Select all" />
                  </th>
                  <th>Product</th>
                  <th>Status</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Sold</th>
                  <th>Updated</th>
                  <th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} data-selected={sel.has(p.id)}>
                    <td>
                      <input type="checkbox" className="a-check" checked={sel.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Select ${p.name}`} />
                    </td>
                    <td className="min-w-[280px]">
                      <div className="flex items-center gap-3">
                        <Thumb src={p.image} name={p.name} />
                        <div className="min-w-0">
                          <Link href={`/admin/products/${p.id}`} className="line-clamp-1 font-medium hover:text-gold-2">
                            {p.name}
                          </Link>
                          <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-mute">
                            <span>{p.brand?.name}</span>
                            <span className="font-mono">{p.sku}</span>
                            {p.isFeatured && <Star className="h-3 w-3 fill-gold text-gold" />}
                            {p.aiGenerated && <Sparkles className="h-3 w-3 text-gold-2" aria-label="AI generated" />}
                            {(!p.seoTitle || !p.seoDesc) && <span className="text-ember">no SEO</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><ProductStatusPill status={p.status} /></td>
                    <td className="text-right">
                      <InlineNumber value={p.price} min={1} format={formatINR} onSave={(price) => patch(p.id, { price })} />
                      <div className="a-num text-[11px] text-mute">
                        {p.mrp > p.price && <span className="line-through">{formatINR(p.mrp)}</span>}
                        {margin(p) !== null && <span className={cn("ml-1.5", margin(p) < 15 ? "text-ember" : "text-lume")}>{margin(p)}%</span>}
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <InlineNumber value={p.stock} onSave={(stock) => patch(p.id, { stock })} />
                        <StockPill stock={p.stock} lowStockAt={p.lowStockAt} />
                      </div>
                    </td>
                    <td className="a-num text-right text-bone-2">
                      {p.soldCount}
                      <div className="text-[10.5px] text-mute">{p.viewCount} views</div>
                    </td>
                    <td className="whitespace-nowrap text-[12px] text-mute">{timeAgo(p.updatedAt)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link href={`/admin/products/${p.id}`} className="a-btn a-btn-ghost a-btn-sm a-btn-icon" title="Edit" aria-label="Edit">
                          <FileEdit />
                        </Link>
                        {p.status === "ACTIVE" && (
                          <a href={`/watches/${p.slug}`} target="_blank" rel="noreferrer" className="a-btn a-btn-ghost a-btn-sm a-btn-icon" title="View in store" aria-label="View in store">
                            <Eye />
                          </a>
                        )}
                        <button className="a-btn a-btn-ghost a-btn-sm a-btn-icon" onClick={() => duplicate(p.id)} title="Duplicate" aria-label="Duplicate">
                          <Copy />
                        </button>
                        {isAdmin && (
                          <ConfirmButton
                            className="a-btn a-btn-ghost a-btn-sm a-btn-icon hover:!text-danger"
                            ariaLabel="Delete"
                            title={`Delete “${p.name}”?`}
                            message="The product and its images will be removed. Products that have orders are archived instead."
                            confirmLabel="Delete"
                            onConfirm={() => remove(p.id)}
                          >
                            <Trash2 />
                          </ConfirmButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            <label className="flex items-center gap-2 px-1 text-xs text-mute">
              <input type="checkbox" className="a-check" checked={allSel} onChange={toggleAll} /> Select all
            </label>
            {items.map((p) => (
              <div key={p.id} className={cn("a-card flex gap-3 p-3", sel.has(p.id) && "border-gold/40")}>
                <input type="checkbox" className="a-check mt-1" checked={sel.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Select ${p.name}`} />
                <Thumb src={p.image} name={p.name} />
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/products/${p.id}`} className="line-clamp-2 text-[13px] font-medium">
                    {p.name}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px]">
                    <ProductStatusPill status={p.status} />
                    <InlineNumber value={p.price} min={1} format={formatINR} onSave={(price) => patch(p.id, { price })} />
                    <span className="text-mute">stock</span>
                    <InlineNumber value={p.stock} onSave={(stock) => patch(p.id, { stock })} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} />
        </>
      )}

      {/* Bulk action bar */}
      <AnimatePresence>
        {sel.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-4xl flex-wrap items-center gap-1.5 rounded-2xl border border-gold/30 bg-ink/95 p-2 shadow-[0_20px_50px_-20px_rgba(17,24,39,.35)] backdrop-blur-xl"
          >
            <span className="px-2 text-[12.5px]">
              <span className="a-num text-gold-2">{sel.size}</span> selected
            </span>
            <button className="a-btn a-btn-sm" disabled={!!busy} onClick={() => bulk("publish")}>{busy === "publish" ? <Spinner /> : <Rocket />} Publish</button>
            <button className="a-btn a-btn-sm" disabled={!!busy} onClick={() => bulk("draft")}><FileEdit /> Draft</button>
            <button className="a-btn a-btn-sm" disabled={!!busy} onClick={() => bulk("archive")}><Archive /> Archive</button>
            <button className="a-btn a-btn-sm" disabled={!!busy} onClick={() => bulk("feature")}><Star /> Feature</button>
            <button className="a-btn a-btn-sm" disabled={!!busy} onClick={() => bulk("unfeature")}><StarOff /> Unfeature</button>
            <button className="a-btn a-btn-sm" disabled={!!busy} onClick={() => setPriceModal(true)}><Percent /> Price %</button>
            {aiOn && (
              <button className="a-btn a-btn-ai a-btn-sm" disabled={!!busy} onClick={() => bulk("seo")}>{busy === "seo" ? <Spinner /> : <Sparkles />} AI SEO</button>
            )}
            {isAdmin && (
              <ConfirmButton
                className="a-btn a-btn-danger a-btn-sm"
                title={`Delete ${sel.size} products?`}
                message="Products with order history will be archived instead of deleted."
                confirmLabel="Delete"
                onConfirm={() => bulk("delete")}
              >
                <Trash2 /> Delete
              </ConfirmButton>
            )}
            <button className="a-btn a-btn-ghost a-btn-sm a-btn-icon ml-auto" onClick={() => setSel(new Set())} aria-label="Clear selection">
              <X />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        open={priceModal}
        onClose={() => setPriceModal(false)}
        title="Adjust price by percentage"
        width={420}
        footer={
          <>
            <button className="a-btn a-btn-ghost" onClick={() => setPriceModal(false)}>Cancel</button>
            <button
              className="a-btn a-btn-gold"
              onClick={async () => {
                setPriceModal(false);
                await bulk("price", { value: Number(pct), round });
              }}
            >
              Apply to {sel.size}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="a-label">Change %</span>
            <input type="number" className="a-input a-num" value={pct} onChange={(e) => setPct(e.target.value)} />
          </label>
          <label>
            <span className="a-label">Rounding</span>
            <select className="a-input" value={round} onChange={(e) => setRound(e.target.value)}>
              <option value="none">Exact</option>
              <option value="9">End in 9 (₹1,499)</option>
              <option value="99">End in 99 (₹1,999)</option>
              <option value="10">Nearest 10</option>
            </select>
          </label>
        </div>
        <p className="a-hint mt-3">Negative for a discount (e.g. −10), positive for an increase. MRP is raised automatically if the new price would exceed it.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[-20, -10, -5, 5, 10, 20].map((v) => (
            <button key={v} type="button" className="chip !h-7" data-active={Number(pct) === v} onClick={() => setPct(v)}>
              {v > 0 ? `+${v}` : v}%
            </button>
          ))}
        </div>
        <Pill tone="gold" className="mt-3">Prices are always recomputed on the server</Pill>
      </Modal>
    </div>
  );
}
