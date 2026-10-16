"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, Minus, Plus, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "../fetcher";
import { Empty, PageHeader, Pagination, SearchInput, Spinner, StockPill, Tabs, useQueryState } from "../ui";

const fmtCover = (d) => (d < 1 ? "<1d" : `${Math.round(d)}d`);

export default function InventoryTable({ tab, rows, counts, page, pages, total }) {
  const { set } = useQueryState();

  return (
    <div>
      <PageHeader
        eyebrow="Catalog"
        title="Inventory"
        description="Stock levels for active watches, with 30-day sell-through, days of cover and a restock suggestion (30 days of demand + safety stock)."
      />
      <Tabs
        className="mb-4"
        value={tab}
        onChange={(v) => set({ tab: v === "low" ? null : v })}
        tabs={[
          { value: "out", label: "Out of stock", count: counts.out },
          { value: "low", label: "Low stock", count: counts.low },
          { value: "all", label: "All active", count: counts.all },
        ]}
      />
      <div className="mb-3">
        <SearchInput className="w-full sm:w-80" placeholder="Name, SKU or brand" />
      </div>

      {rows.length === 0 ? (
        <Empty icon={Boxes} title={tab === "all" ? "No active products" : "All stocked up"}>
          {tab === "out" ? "Nothing is sold out right now." : tab === "low" ? "No active watch is at or below its low-stock threshold." : "Publish products to track their stock here."}
        </Empty>
      ) : (
        <div className="a-table-wrap">
          <table className="a-table min-w-[860px]">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Stock</th>
                <th className="text-right" title="Low-stock threshold">Alert at</th>
                <th className="text-right">Sold 30d</th>
                <th className="text-right">Per day</th>
                <th className="text-right">Cover</th>
                <th className="text-right">Suggested</th>
                <th>Adjust</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <InventoryRow key={r.id} r={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={pages} total={total} />
    </div>
  );
}

function InventoryRow({ r }) {
  const router = useRouter();
  const [stock, setStock] = useState(r.stock);
  const [draft, setDraft] = useState(String(r.stock));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStock(r.stock);
    setDraft(String(r.stock));
  }, [r.stock]);

  async function save(body, msg) {
    setBusy(true);
    try {
      const { product } = await api("/api/admin/inventory", { method: "PATCH", body: { id: r.id, ...body } });
      setStock(product.stock);
      setDraft(String(product.stock));
      toast.success(msg ? msg(product.stock) : `${r.name.slice(0, 40)} → ${product.stock} in stock`);
      router.refresh();
    } catch (e) {
      toast.error(e.message);
      setDraft(String(stock));
    } finally {
      setBusy(false);
    }
  }

  const commitDraft = () => {
    const n = parseInt(draft, 10);
    if (!Number.isFinite(n) || n < 0) return setDraft(String(stock));
    if (n !== stock) save({ stock: n });
  };

  const suggested = Math.max(0, Math.ceil(r.velocity * 30 + r.lowStockAt - stock));

  return (
    <tr>
      <td>
        <Link href={`/admin/products/${r.id}`} className="flex items-center gap-3 hover:text-gold-2">
          <span className="h-10 w-10 flex-none overflow-hidden rounded-lg border border-line bg-ink-3">
            {r.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.image} alt="" className="h-full w-full object-cover" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-[10.5px] uppercase tracking-wider text-gold">{r.brand}</span>
            <span className="line-clamp-1 max-w-[280px]">{r.name}</span>
          </span>
        </Link>
      </td>
      <td className="a-num text-[12px] text-bone-2">{r.sku}</td>
      <td><StockPill stock={stock} lowStockAt={r.lowStockAt} /></td>
      <td className="a-num text-right text-mute">{r.lowStockAt}</td>
      <td className="a-num text-right">{r.sold30}</td>
      <td className="a-num text-right text-bone-2">{r.velocity ? r.velocity.toFixed(2) : "0"}</td>
      <td className={cn("a-num text-right", r.velocity > 0 && stock / r.velocity < 7 ? "text-ember" : "text-bone-2")}>
        {r.velocity > 0 ? fmtCover(stock / r.velocity) : "∞"}
      </td>
      <td className="a-num text-right">
        {suggested > 0 ? <span className="text-gold-2">+{suggested}</span> : <span className="text-mute">—</span>}
      </td>
      <td>
        <div className="flex items-center gap-1">
          <button className="a-btn a-btn-sm a-btn-icon" disabled={busy || stock <= 0} onClick={() => save({ delta: -1 })} aria-label="Decrease stock">
            <Minus />
          </button>
          <input
            className="a-input a-input-sm a-num !w-16 text-center"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setDraft(String(stock));
                e.currentTarget.blur();
              }
            }}
            aria-label="Set stock"
            disabled={busy}
          />
          <button className="a-btn a-btn-sm a-btn-icon" disabled={busy} onClick={() => save({ delta: 1 })} aria-label="Increase stock">
            <Plus />
          </button>
          <button
            className="a-btn a-btn-sm a-btn-ghost"
            disabled={busy || suggested <= 0}
            onClick={() => save({ delta: suggested }, (n) => `Restocked +${suggested} → ${n}`)}
            title="Add the suggested restock quantity"
          >
            {busy ? <Spinner /> : <Wand2 />} Apply
          </button>
        </div>
      </td>
    </tr>
  );
}
