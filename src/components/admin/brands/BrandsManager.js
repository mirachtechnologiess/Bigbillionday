"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Gem, Plus, Search, Sparkles, Star, Trash2 } from "lucide-react";
import { api } from "@/components/admin/fetcher";
import { ConfirmButton, Empty, Field, ImagePicker, PageHeader, Pill, Spinner, Toggle } from "@/components/admin/ui";
import { cn, slugify } from "@/lib/utils";
import { ReorderButtons, SeoPreview, SplitEditor, Thumb, moveItem, useEscape, useIsDesktop } from "./shared";

const FIELDS = ["name", "slug", "logo", "description", "country", "isFeatured", "sortOrder", "seoTitle", "seoDesc"];
const toForm = (b) => ({
  name: b?.name || "",
  slug: b?.slug || "",
  logo: b?.logo || "",
  description: b?.description || "",
  country: b?.country || "",
  isFeatured: b?.isFeatured ?? false,
  sortOrder: b?.sortOrder ?? "",
  seoTitle: b?.seoTitle || "",
  seoDesc: b?.seoDesc || "",
});

export default function BrandsManager({ brands, canDelete, aiOn }) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [items, setItems] = useState(brands);
  const [selected, setSelected] = useState(null); // null | "new" | id
  const [q, setQ] = useState("");
  useEffect(() => setItems(brands), [brands]);

  const close = useCallback(() => setSelected(null), []);
  useEscape(isDesktop && !!selected, close);

  const current = selected && selected !== "new" ? items.find((b) => b.id === selected) : null;
  const visible = useMemo(() => (q ? items.filter((b) => `${b.name} ${b.country || ""}`.toLowerCase().includes(q.toLowerCase())) : items), [items, q]);

  const patch = async (b, data, msg) => {
    setItems((xs) => xs.map((x) => (x.id === b.id ? { ...x, ...data } : x)));
    try {
      await api(`/api/admin/brands/${b.id}`, { method: "PATCH", body: data });
      if (msg) toast.success(msg);
      router.refresh();
    } catch (e) {
      setItems((xs) => xs.map((x) => (x.id === b.id ? b : x)));
      toast.error(e.message);
    }
  };

  const move = async (idx, dir) => {
    const prev = items;
    const next = moveItem(items, idx, idx + dir).map((b, i) => ({ ...b, sortOrder: i }));
    setItems(next);
    try {
      await api("/api/admin/brands/reorder", { method: "POST", body: { ids: next.map((b) => b.id) } });
      router.refresh();
    } catch (e) {
      setItems(prev);
      toast.error(e.message);
    }
  };

  const featured = items.filter((b) => b.isFeatured).length;

  return (
    <div>
      <PageHeader
        eyebrow="Catalog"
        title="Brands"
        description="The maisons you carry. Featured brands headline the storefront; order controls how they appear in menus and filters."
        actions={
          <button className="a-btn a-btn-gold" onClick={() => setSelected("new")}>
            <Plus /> New brand
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
              <input className="a-input !pl-8" placeholder="Filter brands…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <span className="text-[12px] text-mute">
              <span className="a-num text-bone">{items.length}</span> brands · <span className="a-num text-gold-2">{featured}</span> featured
            </span>
          </div>

          {items.length === 0 ? (
            <Empty icon={Gem} title="No brands yet" action={<button className="a-btn a-btn-gold" onClick={() => setSelected("new")}><Plus /> Add a brand</button>}>
              Add brands before creating products — every watch belongs to a brand.
            </Empty>
          ) : (
            <div className="a-table-wrap">
              <table className="a-table">
                <thead>
                  <tr>
                    <th className="w-px">#</th>
                    <th>Brand</th>
                    <th className="hidden sm:table-cell">Country</th>
                    <th className="text-right">Products</th>
                    <th className="w-px">Featured</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((b) => {
                    const idx = items.indexOf(b);
                    return (
                      <tr key={b.id} data-selected={selected === b.id} className="cursor-pointer" onClick={() => setSelected(b.id)}>
                        <td onClick={(e) => e.stopPropagation()}>
                          <ReorderButtons label={b.name} disableUp={!!q || idx === 0} disableDown={!!q || idx === items.length - 1} onUp={() => move(idx, -1)} onDown={() => move(idx, 1)} />
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <Thumb src={b.logo} name={b.name} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 truncate font-medium">
                                {b.name}
                                {b.isFeatured && <Star className="h-3 w-3 fill-gold text-gold" />}
                              </div>
                              <div className="truncate font-mono text-[11px] text-mute">/{b.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden text-bone-2 sm:table-cell">{b.country || <span className="text-mute">—</span>}</td>
                        <td className="a-num text-right">{b.productCount || <span className="text-mute">0</span>}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <Toggle checked={b.isFeatured} onChange={(v) => patch(b, { isFeatured: v }, `${b.name} ${v ? "featured" : "unfeatured"}`)} />
                        </td>
                      </tr>
                    );
                  })}
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[13px] text-mute">No brands match “{q}”.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <BrandEditor
          key={selected || "none"}
          brand={current}
          open={!!selected && (selected === "new" || !!current)}
          isDesktop={isDesktop}
          canDelete={canDelete}
          aiOn={aiOn}
          onClose={close}
          onSaved={(b) => {
            setItems((xs) => (xs.some((x) => x.id === b.id) ? xs.map((x) => (x.id === b.id ? { ...x, ...b } : x)) : [...xs, { ...b, productCount: 0 }]));
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
    </div>
  );
}

function BrandEditor({ brand, open, isDesktop, canDelete, aiOn, onClose, onSaved, onDeleted }) {
  const initial = useMemo(() => toForm(brand), [brand]);
  const [f, setF] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!!brand && brand.slug !== slugify(brand.name));
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiFilled, setAiFilled] = useState([]);
  const set = (p) => setF((s) => ({ ...s, ...p }));
  const dirty = FIELDS.some((k) => String(f[k] ?? "") !== String(initial[k] ?? ""));

  const writeWithAi = async () => {
    if (!f.name.trim()) return toast.error("Enter the brand name first");
    setAiBusy(true);
    try {
      const r = await api("/api/admin/brands/ai", { method: "POST", body: { name: f.name.trim(), country: f.country.trim() || null } });
      const filled = ["description", "seoTitle", "seoDesc"];
      const p = { description: r.description || f.description, seoTitle: r.seoTitle || f.seoTitle, seoDesc: r.seoDesc || f.seoDesc };
      if (!f.country.trim() && r.country) {
        p.country = r.country;
        filled.push("country");
      }
      set(p);
      setAiFilled(filled);
      toast.success("Drafted with AI — review before saving");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setAiBusy(false);
    }
  };

  const save = async () => {
    if (!f.name.trim()) return toast.error("Name is required");
    setBusy(true);
    try {
      const body = { ...f, slug: f.slug || slugify(f.name), sortOrder: f.sortOrder === "" ? undefined : Number(f.sortOrder) };
      const r = brand ? await api(`/api/admin/brands/${brand.id}`, { method: "PATCH", body }) : await api("/api/admin/brands", { method: "POST", body });
      toast.success(brand ? "Brand saved" : `${r.brand.name} created`);
      setAiFilled([]);
      onSaved(r.brand);
    } catch (e) {
      toast.error(e.data?.issues ? `${e.message}: ${Object.entries(e.data.issues).map(([k, v]) => `${k} ${v[0]}`).join(", ")}` : e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    await api(`/api/admin/brands/${brand.id}`, { method: "DELETE" });
    toast.success(`${brand.name} deleted`);
    onDeleted(brand.id);
  };

  const aiCls = (k) => (aiFilled.includes(k) ? "ai-touched" : "");

  const footer = (
    <>
      {brand && canDelete && (
        <ConfirmButton
          className="a-btn a-btn-ghost a-btn-sm mr-auto"
          title={`Delete ${brand.name}?`}
          message={brand.productCount ? `${brand.name} has ${brand.productCount} product(s). Reassign them to another brand first — the delete will be refused.` : "This brand has no products and will be removed permanently."}
          confirmLabel="Delete brand"
          onConfirm={remove}
        >
          <Trash2 /> Delete
        </ConfirmButton>
      )}
      {dirty && <Pill tone="gold">Unsaved</Pill>}
      <button className="a-btn a-btn-gold" onClick={save} disabled={busy || (!dirty && !!brand)}>
        {busy && <Spinner />} {brand ? "Save brand" : "Create brand"}
      </button>
    </>
  );

  return (
    <SplitEditor open={open} isDesktop={isDesktop} onClose={onClose} title={brand ? brand.name : "New brand"} subtitle={brand ? `${brand.productCount} products · /brands/${brand.slug}` : "Add a watch brand"} footer={footer} emptyText="Select a brand">
      <form method="post"
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-4">
          <ImagePicker value={f.logo} onChange={(url) => set({ logo: url })} folder="brands" aspect="aspect-square" label="Logo" />
          <div className="grid content-start gap-3">
            <Field label="Name">
              <input
                className="a-input"
                value={f.name}
                maxLength={80}
                autoFocus={!brand}
                placeholder="e.g. Seiko"
                onChange={(e) => set({ name: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })}
              />
            </Field>
            <Field label="Slug" right={slugTouched && <button type="button" className="text-[10.5px] text-gold hover:underline" onClick={() => { setSlugTouched(false); set({ slug: slugify(f.name) }); }}>auto</button>}>
              <input className="a-input font-mono text-[12px]" value={f.slug} onChange={(e) => { setSlugTouched(true); set({ slug: slugify(e.target.value) }); }} />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink p-3">
          <div className="text-[12px] text-mute">Draft the story &amp; SEO from the brand name.</div>
          <button type="button" className="a-btn a-btn-ai a-btn-sm" onClick={writeWithAi} disabled={aiBusy || !aiOn} title={aiOn ? undefined : "AI is not configured (NVIDIA_API_KEY)"}>
            {aiBusy ? <Spinner /> : <Sparkles />} ✦ Write with AI
          </button>
        </div>

        <Field label="Description" counter={f.description.length} max={4000}>
          <textarea className={cn("a-input min-h-[120px] py-2", aiCls("description"))} value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="A short introduction shown on the brand page." />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Country">
            <input className={cn("a-input", aiCls("country"))} value={f.country} maxLength={60} placeholder="Japan" onChange={(e) => set({ country: e.target.value })} />
          </Field>
          <Field label="Sort order" hint="Lower shows first">
            <input className="a-input a-num" type="number" value={f.sortOrder} onChange={(e) => set({ sortOrder: e.target.value })} />
          </Field>
        </div>

        <Toggle checked={f.isFeatured} onChange={(v) => set({ isFeatured: v })} label="Featured brand" hint="Shown in the homepage brand rail and top of menus." />

        <div className="grid gap-3 border-t border-line pt-4">
          <Field label="SEO title" counter={f.seoTitle.length} max={60}>
            <input className={cn("a-input", aiCls("seoTitle"))} value={f.seoTitle} maxLength={70} onChange={(e) => set({ seoTitle: e.target.value })} placeholder={`${f.name || "Brand"} Watches — Buy Online in India`} />
          </Field>
          <Field label="SEO description" counter={f.seoDesc.length} max={155}>
            <textarea className={cn("a-input min-h-[72px] py-2", aiCls("seoDesc"))} value={f.seoDesc} maxLength={170} onChange={(e) => set({ seoDesc: e.target.value })} />
          </Field>
          <SeoPreview title={f.seoTitle || (f.name && `${f.name} Watches`)} desc={f.seoDesc} path={`/brands/${f.slug || "…"}`} />
        </div>
        <button type="submit" className="hidden" />
      </form>
    </SplitEditor>
  );
}
