"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CornerDownRight, FolderTree, Plus, Trash2 } from "lucide-react";
import { api } from "@/components/admin/fetcher";
import { ConfirmButton, Empty, Field, ImagePicker, PageHeader, Pill, Spinner } from "@/components/admin/ui";
import { cn, slugify } from "@/lib/utils";
import { ReorderButtons, SeoPreview, SplitEditor, Thumb, moveItem, useEscape, useIsDesktop } from "@/components/admin/brands/shared";

const FIELDS = ["name", "slug", "parentId", "image", "description", "sortOrder", "seoTitle", "seoDesc"];
const toForm = (c, parentId) => ({
  name: c?.name || "",
  slug: c?.slug || "",
  parentId: c ? c.parentId || "" : parentId || "",
  image: c?.image || "",
  description: c?.description || "",
  sortOrder: c?.sortOrder ?? "",
  seoTitle: c?.seoTitle || "",
  seoDesc: c?.seoDesc || "",
});

/** children map keyed by parentId ("" for roots), each list sorted by sortOrder then name. */
function childrenMap(items) {
  const m = new Map();
  for (const c of items) {
    const k = c.parentId || "";
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(c);
  }
  for (const list of m.values()) list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return m;
}

/** Depth-first flatten → [{ cat, depth, siblings, index }]. Orphans (missing parent) are treated as roots. */
function flatten(items) {
  const m = childrenMap(items);
  const ids = new Set(items.map((c) => c.id));
  const roots = [...(m.get("") || []), ...items.filter((c) => c.parentId && !ids.has(c.parentId))];
  const out = [];
  const walk = (list, depth) =>
    list.forEach((cat, index) => {
      out.push({ cat, depth, siblings: list, index });
      walk(m.get(cat.id) || [], depth + 1);
    });
  walk(roots, 0);
  return out;
}

function descendantIds(items, id) {
  const m = childrenMap(items);
  const out = new Set();
  const stack = [...(m.get(id) || [])];
  while (stack.length) {
    const c = stack.pop();
    out.add(c.id);
    stack.push(...(m.get(c.id) || []));
  }
  return out;
}

export default function CategoriesManager({ categories, canDelete }) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [items, setItems] = useState(categories);
  const [selected, setSelected] = useState(null); // null | { new: true, parentId } | id
  useEffect(() => setItems(categories), [categories]);

  const close = useCallback(() => setSelected(null), []);
  useEscape(isDesktop && !!selected, close);

  const rows = useMemo(() => flatten(items), [items]);
  const isNew = selected && typeof selected === "object";
  const current = selected && !isNew ? items.find((c) => c.id === selected) : null;

  const move = async (siblings, index, dir) => {
    const next = moveItem(siblings, index, index + dir);
    if (next === siblings) return;
    const order = new Map(next.map((c, i) => [c.id, i]));
    const prev = items;
    setItems((xs) => xs.map((x) => (order.has(x.id) ? { ...x, sortOrder: order.get(x.id) } : x)));
    try {
      await api("/api/admin/categories/reorder", { method: "POST", body: { ids: next.map((c) => c.id) } });
      router.refresh();
    } catch (e) {
      setItems(prev);
      toast.error(e.message);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Catalog"
        title="Categories"
        description="A tree of watch types. Sub-categories nest under a parent; order is per level."
        actions={
          <button className="a-btn a-btn-gold" onClick={() => setSelected({ new: true, parentId: "" })}>
            <Plus /> New category
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0">
          {items.length === 0 ? (
            <Empty icon={FolderTree} title="No categories yet" action={<button className="a-btn a-btn-gold" onClick={() => setSelected({ new: true, parentId: "" })}><Plus /> Add a category</button>}>
              Start with broad types like Automatic, Chronograph, Smart and Dress — then nest specifics beneath.
            </Empty>
          ) : (
            <div className="a-table-wrap">
              <table className="a-table">
                <thead>
                  <tr>
                    <th className="w-px">Order</th>
                    <th>Category</th>
                    <th className="text-right">Products</th>
                    <th className="w-px" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ cat, depth, siblings, index }) => (
                    <tr key={cat.id} data-selected={selected === cat.id} className="cursor-pointer" onClick={() => setSelected(cat.id)}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <ReorderButtons label={cat.name} disableUp={index === 0} disableDown={index === siblings.length - 1} onUp={() => move(siblings, index, -1)} onDown={() => move(siblings, index, 1)} />
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5" style={{ paddingLeft: depth * 22 }}>
                          {depth > 0 && <CornerDownRight className="h-3.5 w-3.5 flex-none text-line-2" />}
                          <Thumb src={cat.image} name={cat.name} className={depth ? "!h-8 !w-8" : ""} />
                          <div className="min-w-0">
                            <div className={cn("truncate", depth === 0 ? "font-semibold" : "text-bone-2")}>{cat.name}</div>
                            <div className="truncate font-mono text-[11px] text-mute">
                              /{cat.slug}
                              {cat.childCount > 0 && <span className="ml-2 text-gold/80">{cat.childCount} sub</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="a-num text-right">{cat.productCount || <span className="text-mute">0</span>}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button className="a-btn a-btn-ghost a-btn-sm whitespace-nowrap" onClick={() => setSelected({ new: true, parentId: cat.id })} title={`Add sub-category under ${cat.name}`}>
                          <Plus /> <span className="hidden sm:inline">Sub</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <CategoryEditor
          key={isNew ? `new-${selected.parentId}` : selected || "none"}
          category={current}
          defaultParent={isNew ? selected.parentId : ""}
          items={items}
          open={!!isNew || !!current}
          isDesktop={isDesktop}
          canDelete={canDelete}
          onClose={close}
          onSaved={(c) => {
            setItems((xs) => (xs.some((x) => x.id === c.id) ? xs.map((x) => (x.id === c.id ? { ...x, ...c } : x)) : [...xs, { ...c, productCount: 0, childCount: 0 }]));
            setSelected(c.id);
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

function CategoryEditor({ category, defaultParent, items, open, isDesktop, canDelete, onClose, onSaved, onDeleted }) {
  const initial = useMemo(() => toForm(category, defaultParent), [category, defaultParent]);
  const [f, setF] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!!category && category.slug !== slugify(category.name));
  const [busy, setBusy] = useState(false);
  const set = (p) => setF((s) => ({ ...s, ...p }));
  const dirty = FIELDS.some((k) => String(f[k] ?? "") !== String(initial[k] ?? ""));

  // parent options: everything except itself and its descendants, shown as an indented tree
  const parentOptions = useMemo(() => {
    const banned = category ? descendantIds(items, category.id).add(category.id) : new Set();
    return flatten(items).filter(({ cat }) => !banned.has(cat.id));
  }, [items, category]);

  const save = async () => {
    if (!f.name.trim()) return toast.error("Name is required");
    setBusy(true);
    try {
      const body = { ...f, parentId: f.parentId || null, slug: f.slug || slugify(f.name), sortOrder: f.sortOrder === "" ? undefined : Number(f.sortOrder) };
      const r = category ? await api(`/api/admin/categories/${category.id}`, { method: "PATCH", body }) : await api("/api/admin/categories", { method: "POST", body });
      toast.success(category ? "Category saved" : `${r.category.name} created`);
      onSaved(r.category);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const blocked = category && (category.productCount > 0 || category.childCount > 0);
  const footer = (
    <>
      {category && canDelete && (
        <ConfirmButton
          className="a-btn a-btn-ghost a-btn-sm mr-auto"
          title={`Delete ${category.name}?`}
          message={
            blocked
              ? `${category.name} has ${category.childCount} sub-categories and ${category.productCount} products. Move them elsewhere first — the delete will be refused.`
              : "This empty category will be removed permanently."
          }
          confirmLabel="Delete"
          onConfirm={async () => {
            await api(`/api/admin/categories/${category.id}`, { method: "DELETE" });
            toast.success(`${category.name} deleted`);
            onDeleted(category.id);
          }}
        >
          <Trash2 /> Delete
        </ConfirmButton>
      )}
      {dirty && <Pill tone="gold">Unsaved</Pill>}
      <button className="a-btn a-btn-gold" onClick={save} disabled={busy || (!dirty && !!category)}>
        {busy && <Spinner />} {category ? "Save category" : "Create category"}
      </button>
    </>
  );

  const parentName = items.find((c) => c.id === f.parentId)?.name;

  return (
    <SplitEditor
      open={open}
      isDesktop={isDesktop}
      onClose={onClose}
      title={category ? category.name : "New category"}
      subtitle={category ? `${category.productCount} products · /category/${category.slug}` : parentName ? `Inside ${parentName}` : "Top-level category"}
      footer={footer}
      emptyText="Select a category"
    >
      <form method="post"
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input className="a-input" value={f.name} maxLength={80} autoFocus={!category} placeholder="Automatic" onChange={(e) => set({ name: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })} />
          </Field>
          <Field label="Slug" right={slugTouched && <button type="button" className="text-[10.5px] text-gold hover:underline" onClick={() => { setSlugTouched(false); set({ slug: slugify(f.name) }); }}>auto</button>}>
            <input className="a-input font-mono text-[12px]" value={f.slug} onChange={(e) => { setSlugTouched(true); set({ slug: slugify(e.target.value) }); }} />
          </Field>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
          <Field label="Parent" hint="A category can't be placed inside itself or its own sub-categories.">
            <select className="a-input" value={f.parentId} onChange={(e) => set({ parentId: e.target.value })}>
              <option value="">— None (top level) —</option>
              {parentOptions.map(({ cat, depth }) => (
                <option key={cat.id} value={cat.id}>
                  {"  ".repeat(depth * 2)}
                  {depth ? "└ " : ""}
                  {cat.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sort order">
            <input className="a-input a-num" type="number" value={f.sortOrder} onChange={(e) => set({ sortOrder: e.target.value })} />
          </Field>
        </div>

        <div>
          <span className="a-label">Image</span>
          <ImagePicker value={f.image} onChange={(url) => set({ image: url })} folder="categories" aspect="aspect-[16/9]" label="Upload category image" />
        </div>

        <Field label="Description" counter={f.description.length} max={4000}>
          <textarea className="a-input min-h-[96px] py-2" value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="Intro copy shown at the top of the category page." />
        </Field>

        <div className="grid gap-3 border-t border-line pt-4">
          <Field label="SEO title" counter={f.seoTitle.length} max={60}>
            <input className="a-input" value={f.seoTitle} maxLength={70} onChange={(e) => set({ seoTitle: e.target.value })} />
          </Field>
          <Field label="SEO description" counter={f.seoDesc.length} max={155}>
            <textarea className="a-input min-h-[72px] py-2" value={f.seoDesc} maxLength={170} onChange={(e) => set({ seoDesc: e.target.value })} />
          </Field>
          <SeoPreview title={f.seoTitle || (f.name && `${f.name} Watches`)} desc={f.seoDesc} path={`/category/${f.slug || "…"}`} />
        </div>
        <button type="submit" className="hidden" />
      </form>
    </SplitEditor>
  );
}
