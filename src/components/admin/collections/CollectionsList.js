"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, Home, Layers, Plus } from "lucide-react";
import { api } from "@/components/admin/fetcher";
import { Empty, PageHeader, Pill, Toggle } from "@/components/admin/ui";
import { ReorderButtons, moveItem } from "@/components/admin/brands/shared";

export default function CollectionsList({ collections }) {
  const router = useRouter();
  const [items, setItems] = useState(collections);
  useEffect(() => setItems(collections), [collections]);

  const patch = async (c, data, msg) => {
    setItems((xs) => xs.map((x) => (x.id === c.id ? { ...x, ...data } : x)));
    try {
      await api(`/api/admin/collections/${c.id}`, { method: "PATCH", body: data });
      toast.success(msg);
      router.refresh();
    } catch (e) {
      setItems((xs) => xs.map((x) => (x.id === c.id ? c : x)));
      toast.error(e.message);
    }
  };

  const move = async (idx, dir) => {
    const prev = items;
    const next = moveItem(items, idx, idx + dir);
    if (next === items) return;
    setItems(next);
    try {
      await api("/api/admin/collections/reorder", { method: "POST", body: { ids: next.map((c) => c.id) } });
      router.refresh();
    } catch (e) {
      setItems(prev);
      toast.error(e.message);
    }
  };

  const onHome = items.filter((c) => c.showOnHome && c.isActive).length;

  return (
    <div>
      <PageHeader
        eyebrow="Catalog"
        title="Collections"
        description="Hand-picked edits — “Under ₹10k”, “Divers”, “Gifts for Him”. Active collections get a public page; homepage ones appear as rails in this order."
        actions={
          <Link href="/admin/collections/new" className="a-btn a-btn-gold">
            <Plus /> New collection
          </Link>
        }
      />

      {items.length === 0 ? (
        <Empty icon={Layers} title="No collections yet" action={<Link href="/admin/collections/new" className="a-btn a-btn-gold"><Plus /> Curate the first edit</Link>}>
          Group watches into themed edits and feature them on the homepage.
        </Empty>
      ) : (
        <>
          <div className="mb-3 text-[12px] text-mute">
            <span className="a-num text-bone">{items.length}</span> collections · <span className="a-num text-gold-2">{onHome}</span> live on the homepage
          </div>
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th className="w-px">#</th>
                  <th>Collection</th>
                  <th className="hidden md:table-cell">Preview</th>
                  <th className="text-right">Products</th>
                  <th className="w-px">Active</th>
                  <th className="w-px whitespace-nowrap">On home</th>
                  <th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {items.map((c, idx) => (
                  <tr key={c.id} className="cursor-pointer" onClick={() => router.push(`/admin/collections/${c.id}`)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <ReorderButtons label={c.name} disableUp={idx === 0} disableDown={idx === items.length - 1} onUp={() => move(idx, -1)} onDown={() => move(idx, 1)} />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="relative h-11 w-16 flex-none overflow-hidden rounded-lg border border-line bg-ink-3">
                          {c.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Layers className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-mute" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 truncate font-medium">
                            {c.name}
                            {c.showOnHome && c.isActive && <Pill tone="gold" dot={false}><Home className="h-3 w-3" /> Home</Pill>}
                          </div>
                          <div className="truncate font-mono text-[11px] text-mute">/collections/{c.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell">
                      <div className="flex -space-x-2">
                        {c.previews.map((src, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={src} alt="" className="h-8 w-8 rounded-full border-2 border-ink-2 bg-ink-3 object-cover" />
                        ))}
                        {c.previews.length === 0 && <span className="text-[12px] text-mute">Empty</span>}
                      </div>
                    </td>
                    <td className="a-num text-right">{c.productCount}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Toggle checked={c.isActive} onChange={(v) => patch(c, { isActive: v }, `${c.name} ${v ? "published" : "hidden"}`)} />
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Toggle checked={c.showOnHome} onChange={(v) => patch(c, { showOnHome: v }, v ? `${c.name} added to homepage` : `${c.name} removed from homepage`)} />
                    </td>
                    <td>
                      <ChevronRight className="h-4 w-4 text-mute" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
