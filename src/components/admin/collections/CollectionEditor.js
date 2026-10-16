"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Check, ExternalLink, GripVertical, Plus, Search, Trash2, Watch, X } from "lucide-react";
import { api } from "@/components/admin/fetcher";
import { Card, ConfirmButton, Field, ImagePicker, PageHeader, Pill, ProductStatusPill, Spinner, Toggle } from "@/components/admin/ui";
import { cn, formatINR, slugify, storeUrl } from "@/lib/utils";
import { moveItem } from "@/components/admin/brands/shared";

const toForm = (c) => ({
  name: c?.name || "",
  slug: c?.slug || "",
  description: c?.description || "",
  image: c?.image || "",
  isActive: c?.isActive ?? true,
  showOnHome: c?.showOnHome ?? false,
  sortOrder: c?.sortOrder ?? "",
});

export default function CollectionEditor({ collection, canDelete }) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => ({ form: toForm(collection), ids: (collection?.products || []).map((p) => p.id) }));
  const [f, setF] = useState(() => toForm(collection));
  const [products, setProducts] = useState(collection?.products || []);
  const [slugTouched, setSlugTouched] = useState(!!collection && collection.slug !== slugify(collection.name));
  const [busy, setBusy] = useState(false);
  const set = (p) => setF((s) => ({ ...s, ...p }));

  const ids = useMemo(() => products.map((p) => p.id), [products]);
  const idSet = useMemo(() => new Set(ids), [ids]);
  const dirty = JSON.stringify(f) !== JSON.stringify(saved.form) || ids.join() !== saved.ids.join();

  const save = async () => {
    if (!f.name.trim()) return toast.error("Name is required");
    setBusy(true);
    try {
      const body = { ...f, slug: f.slug || slugify(f.name), sortOrder: f.sortOrder === "" ? undefined : Number(f.sortOrder), productIds: ids };
      if (collection) {
        await api(`/api/admin/collections/${collection.id}`, { method: "PUT", body });
        setSaved({ form: f, ids });
        toast.success("Collection saved");
        router.refresh();
      } else {
        const r = await api("/api/admin/collections", { method: "POST", body });
        setSaved({ form: f, ids });
        toast.success(`${r.collection.name} created`);
        router.replace(`/admin/collections/${r.collection.id}`);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Cmd/Ctrl+S to save, warn before leaving with unsaved changes
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const h = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const add = (p) => {
    if (idSet.has(p.id)) return;
    setProducts((ps) => [...ps, p]);
  };
  const remove = (id) => setProducts((ps) => ps.filter((p) => p.id !== id));

  return (
    <div>
      <PageHeader
        back="/admin/collections"
        eyebrow="Collection"
        title={collection ? f.name || collection.name : f.name || "New collection"}
        description={collection ? `/collections/${collection.slug}` : "Name it, pick the watches, set the order."}
        actions={
          <>
            {dirty && <Pill tone="gold">Unsaved changes</Pill>}
            {collection && f.isActive && (
              <Link href={storeUrl(`/collections/${collection.slug}`)} target="_blank" className="a-btn a-btn-ghost">
                <ExternalLink /> View
              </Link>
            )}
            <button className="a-btn a-btn-gold" onClick={save} disabled={busy || (!dirty && !!collection)}>
              {busy && <Spinner />} {collection ? "Save" : "Create collection"} <span className="a-kbd !h-[18px] !bg-transparent !text-white/80 !border-white/30">⌘S</span>
            </button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <Card title="Details">
            <div className="grid gap-4">
              <Field label="Name">
                <input className="a-input" value={f.name} maxLength={100} autoFocus={!collection} placeholder="Divers under ₹25k" onChange={(e) => set({ name: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })} />
              </Field>
              <Field label="Slug" right={slugTouched && <button type="button" className="text-[10.5px] text-gold hover:underline" onClick={() => { setSlugTouched(false); set({ slug: slugify(f.name) }); }}>auto</button>}>
                <input className="a-input font-mono text-[12px]" value={f.slug} onChange={(e) => { setSlugTouched(true); set({ slug: slugify(e.target.value) }); }} />
              </Field>
              <Field label="Description" counter={f.description.length} max={4000}>
                <textarea className="a-input min-h-[96px] py-2" value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="One or two lines introducing the edit." />
              </Field>
              <div>
                <span className="a-label">Cover image</span>
                <ImagePicker value={f.image} onChange={(url) => set({ image: url })} folder="collections" aspect="aspect-[16/9]" label="Upload cover" />
              </div>
            </div>
          </Card>

          <Card title="Visibility">
            <div className="grid gap-4">
              <Toggle checked={f.isActive} onChange={(v) => set({ isActive: v })} label="Active" hint="Inactive collections are hidden from the storefront." />
              <Toggle checked={f.showOnHome} onChange={(v) => set({ showOnHome: v })} label="Show on homepage" hint="Rendered as a product rail on the homepage." />
              <Field label="Sort order" hint="Lower numbers appear first.">
                <input className="a-input a-num w-28" type="number" value={f.sortOrder} onChange={(e) => set({ sortOrder: e.target.value })} />
              </Field>
            </div>
          </Card>

          {collection && canDelete && (
            <ConfirmButton
              className="a-btn a-btn-ghost justify-self-start"
              title={`Delete ${collection.name}?`}
              message="The collection page disappears; the products themselves are not affected."
              confirmLabel="Delete collection"
              onConfirm={async () => {
                await api(`/api/admin/collections/${collection.id}`, { method: "DELETE" });
                toast.success("Collection deleted");
                router.push("/admin/collections");
                router.refresh();
              }}
            >
              <Trash2 /> Delete collection
            </ConfirmButton>
          )}
        </div>

        <div className="grid content-start gap-4">
          <ProductSearch onAdd={add} selected={idSet} />
          <SelectedProducts products={products} setProducts={setProducts} onRemove={remove} />
        </div>
      </div>
    </div>
  );
}

function ProductSearch({ onAdd, selected }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api(`/api/admin/collections/products-search?q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        setResults(r.products);
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
  }, [q]);

  return (
    <Card title="Add watches" icon={Search} bodyClass="!p-0">
      <div className="border-b border-line p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
          <input className="a-input !pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, SKU, model or brand…" />
          {loading && <Spinner className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mute" />}
        </div>
      </div>
      <ul className="max-h-[300px] divide-y divide-line overflow-y-auto">
        {results.map((p) => {
          const added = selected.has(p.id);
          return (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2">
              <ProductThumb src={p.image} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px]">{p.name}</div>
                <div className="flex items-center gap-2 text-[11px] text-mute">
                  <span className="font-mono">{p.sku}</span>
                  {p.brand && <span>· {p.brand}</span>}
                </div>
              </div>
              <span className="a-num hidden text-[12px] text-bone-2 sm:block">{formatINR(p.price)}</span>
              {p.status !== "ACTIVE" && <ProductStatusPill status={p.status} />}
              <button type="button" className={cn("a-btn a-btn-sm", added ? "a-btn-ghost" : "")} disabled={added} onClick={() => onAdd(p)}>
                {added ? <Check /> : <Plus />} {added ? "Added" : "Add"}
              </button>
            </li>
          );
        })}
        {!loading && results.length === 0 && <li className="px-3 py-8 text-center text-[12.5px] text-mute">No products found{q ? ` for “${q}”` : ""}.</li>}
      </ul>
    </Card>
  );
}

function SelectedProducts({ products, setProducts, onRemove }) {
  const [dragId, setDragId] = useState(null);
  const move = (i, dir) => setProducts((ps) => moveItem(ps, i, i + dir));
  const inactive = products.filter((p) => p.status !== "ACTIVE").length;

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          In this collection <span className="a-num rounded-full bg-ink-3 px-2 py-0.5 text-[11px] text-gold-2">{products.length}</span>
        </span>
      }
      actions={products.length > 0 && <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={() => setProducts([])}><X /> Clear</button>}
      bodyClass="!p-0"
    >
      {inactive > 0 && <div className="border-b border-line bg-gold/5 px-3 py-2 text-[11.5px] text-gold-2">{inactive} draft/archived product(s) won’t show on the storefront until activated.</div>}
      {products.length === 0 ? (
        <div className="a-dots flex flex-col items-center justify-center px-6 py-14 text-center">
          <Watch className="mb-2 h-5 w-5 text-gold" />
          <div className="font-display text-xl">No watches yet</div>
          <p className="mt-1 text-[12px] text-mute">Search above and add products. Drag to set the display order.</p>
        </div>
      ) : (
        <ol className="divide-y divide-line">
          {products.map((p, i) => (
            <li
              key={p.id}
              draggable
              onDragStart={(e) => {
                setDragId(p.id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", p.id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!dragId || dragId === p.id) return;
                setProducts((ps) => moveItem(ps, ps.findIndex((x) => x.id === dragId), ps.findIndex((x) => x.id === p.id)));
              }}
              onDrop={(e) => e.preventDefault()}
              onDragEnd={() => setDragId(null)}
              className={cn("flex items-center gap-3 px-3 py-2 transition-colors", dragId === p.id ? "bg-gold/10 opacity-60" : "hover:bg-ink-2")}
            >
              <GripVertical className="h-4 w-4 flex-none cursor-grab text-mute active:cursor-grabbing" />
              <span className="a-num w-6 text-right text-[11px] text-mute">{i + 1}</span>
              <ProductThumb src={p.image} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px]">{p.name}</div>
                <div className="flex items-center gap-2 text-[11px] text-mute">
                  <span className="font-mono">{p.sku}</span>
                  {p.brand && <span>· {p.brand}</span>}
                </div>
              </div>
              <span className="a-num hidden text-[12px] text-bone-2 sm:block">{formatINR(p.price)}</span>
              {p.status !== "ACTIVE" && <ProductStatusPill status={p.status} />}
              <div className="flex items-center gap-0.5">
                <button type="button" className="a-btn a-btn-ghost a-btn-sm a-btn-icon" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                  <ArrowUp />
                </button>
                <button type="button" className="a-btn a-btn-ghost a-btn-sm a-btn-icon" disabled={i === products.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                  <ArrowDown />
                </button>
                <button type="button" className="a-btn a-btn-ghost a-btn-sm a-btn-icon hover:!text-danger" onClick={() => onRemove(p.id)} aria-label={`Remove ${p.name}`}>
                  <X />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function ProductThumb({ src }) {
  return (
    <div className="grid h-10 w-10 flex-none place-items-center overflow-hidden rounded-lg border border-line bg-ink-3">
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <Watch className="h-4 w-4 text-mute" />}
    </div>
  );
}
