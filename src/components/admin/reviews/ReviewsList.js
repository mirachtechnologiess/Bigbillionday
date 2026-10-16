"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Check, ExternalLink, MessageSquareText, Sparkles, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "../fetcher";
import { ConfirmButton, Empty, PageHeader, Pagination, Pill, SearchInput, Spinner, Tabs, fmtDate, timeAgo, useQueryState } from "../ui";

const STATUS_TONE = { PENDING: "gold", APPROVED: "lume", REJECTED: "danger" };
const SENTIMENT_TONE = { positive: "lume", neutral: "mute", negative: "ember" };

function parseSentiment(s) {
  const parts = String(s || "").split("|").filter(Boolean);
  return { sentiment: parts[0] || null, spam: parts.includes("spam"), abusive: parts.includes("abusive") };
}

function Stars({ n }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("h-3.5 w-3.5", i <= n ? "fill-gold text-gold" : "text-line-2")} />
      ))}
    </span>
  );
}

export default function ReviewsList({ status, rows, counts, page, pages, total, aiOn, unclassified, isAdmin }) {
  const router = useRouter();
  const { sp, set } = useQueryState();
  const [selected, setSelected] = useState(() => new Set());
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [classifying, setClassifying] = useState(false);

  const key = rows.map((r) => r.id).join(",");
  useEffect(() => setSelected(new Set()), [key]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function setStatus(r, next) {
    setBusyId(r.id);
    try {
      await api(`/api/admin/reviews/${r.id}`, { method: "PATCH", body: { status: next } });
      toast.success(next === "APPROVED" ? "Review approved — now live" : next === "REJECTED" ? "Review rejected" : "Moved back to pending");
      router.refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(r) {
    await api(`/api/admin/reviews/${r.id}`, { method: "DELETE" });
    toast.success("Review deleted");
    router.refresh();
  }

  async function bulk(action) {
    setBulkBusy(true);
    try {
      const { count } = await api("/api/admin/reviews/bulk", { method: "POST", body: { ids: [...selected], action } });
      toast.success(`${count} review${count === 1 ? "" : "s"} ${action === "DELETE" ? "deleted" : action.toLowerCase()}`);
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBulkBusy(false);
    }
  }

  async function classify(ids) {
    setClassifying(true);
    try {
      const r = await api("/api/admin/reviews/classify", { method: "POST", body: ids ? { ids } : {} });
      if (!r.processed) toast.info("Nothing to classify — every pending review already has a sentiment.");
      else
        toast.success(
          `Classified ${r.processed}: ${r.flagged} flagged` + (r.approved || r.rejected ? ` · ${r.approved} auto-approved · ${r.rejected} auto-rejected` : "")
        );
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setClassifying(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title="Reviews"
        description="Moderate what shoppers read. Approved reviews update the product's star rating instantly."
        actions={
          aiOn && (
            <button className="a-btn a-btn-ai" onClick={() => classify()} disabled={classifying} title="Classify up to 40 pending reviews without a sentiment">
              {classifying ? <Spinner /> : <Sparkles />} AI classify pending
              {unclassified > 0 && <span className="a-num rounded-full bg-gold/15 px-1.5 text-[10px] text-gold-2">{unclassified}</span>}
            </button>
          )
        }
      />

      <Tabs
        className="mb-4"
        value={status}
        onChange={(v) => set({ status: v === "PENDING" ? null : v })}
        tabs={[
          { value: "PENDING", label: "Pending", count: counts.PENDING },
          { value: "APPROVED", label: "Approved", count: counts.APPROVED },
          { value: "REJECTED", label: "Rejected", count: counts.REJECTED },
          { value: "ALL", label: "All", count: counts.ALL },
        ]}
      />

      <div className="mb-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <SearchInput className="col-span-2 sm:w-72" placeholder="Search text, name or product" />
        <select className="a-input sm:w-36" value={sp.get("rating") || ""} onChange={(e) => set({ rating: e.target.value })} aria-label="Rating">
          <option value="">Any rating</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>
          ))}
        </select>
        <select className="a-input sm:w-40" value={sp.get("flag") || ""} onChange={(e) => set({ flag: e.target.value })} aria-label="AI flag">
          <option value="">Any AI label</option>
          <option value="negative">Negative</option>
          <option value="spam">Spam</option>
          <option value="abusive">Abusive</option>
          <option value="unclassified">Not classified</option>
        </select>
        {rows.length > 0 && (
          <label className="col-span-2 flex items-center gap-2 text-[12.5px] text-bone-2 sm:ml-auto">
            <input type="checkbox" className="a-check" checked={allChecked} onChange={() => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)))} />
            Select page
          </label>
        )}
      </div>

      {selected.size > 0 && (
        <div className="sticky top-2 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-gold/40 bg-ink-3/95 p-2.5 backdrop-blur">
          <span className="a-num px-1 text-[12.5px] text-gold-2">{selected.size} selected</span>
          <button className="a-btn a-btn-sm a-btn-gold" disabled={bulkBusy} onClick={() => bulk("APPROVED")}><Check /> Approve</button>
          <button className="a-btn a-btn-sm" disabled={bulkBusy} onClick={() => bulk("REJECTED")}><X /> Reject</button>
          {aiOn && selected.size <= 40 && (
            <button className="a-btn a-btn-sm a-btn-ai" disabled={classifying} onClick={() => classify([...selected])}><Sparkles /> Classify</button>
          )}
          {isAdmin && (
            <ConfirmButton className="a-btn a-btn-sm a-btn-danger" title={`Delete ${selected.size} reviews?`} confirmLabel="Delete" onConfirm={() => bulk("DELETE")}>
              <Trash2 /> Delete
            </ConfirmButton>
          )}
          <button className="a-btn a-btn-sm a-btn-ghost" onClick={() => setSelected(new Set())}>Clear</button>
          {bulkBusy && <Spinner />}
        </div>
      )}

      {rows.length === 0 ? (
        <Empty icon={MessageSquareText} title={status === "PENDING" ? "Inbox zero" : "No reviews"}>
          {status === "PENDING" ? "No reviews are waiting for moderation." : "Nothing matches these filters."}
        </Empty>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => {
            const s = parseSentiment(r.sentiment);
            const sel = selected.has(r.id);
            return (
              <li key={r.id} className={cn("a-card flex gap-3 p-3 sm:p-4", sel && "border-gold/50 bg-gold/[0.03]", (s.spam || s.abusive) && "border-danger/30")}>
                <input type="checkbox" className="a-check mt-1" checked={sel} onChange={() => toggle(r.id)} aria-label="Select review" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <Link href={`/admin/products/${r.product.id}`} className="flex min-w-0 items-center gap-2 hover:text-gold-2">
                      <span className="h-8 w-8 flex-none overflow-hidden rounded-md border border-line bg-ink-3">
                        {r.product.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.product.image} alt="" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="line-clamp-1 max-w-[320px] text-[12.5px] text-bone-2">{r.product.name}</span>
                    </Link>
                    <a href={`/watches/${r.product.slug}#reviews`} target="_blank" rel="noreferrer" className="text-mute hover:text-bone" aria-label="Open on storefront">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <Stars n={r.rating} />
                    <span className="text-[13px] font-medium">{r.name}</span>
                    {r.verified && (
                      <Pill tone="info" dot={false}><BadgeCheck className="h-3 w-3" /> Verified buyer</Pill>
                    )}
                    <Pill tone={STATUS_TONE[r.status]}>{r.status.toLowerCase()}</Pill>
                    {s.sentiment && <Pill tone={SENTIMENT_TONE[s.sentiment] || "mute"} dot={false}><Sparkles className="h-3 w-3" /> {s.sentiment}</Pill>}
                    {s.spam && <Pill tone="danger">spam</Pill>}
                    {s.abusive && <Pill tone="danger">abusive</Pill>}
                    <span className="text-[11.5px] text-mute" title={fmtDate(r.createdAt, true)}>{timeAgo(r.createdAt)}</span>
                  </div>

                  {r.title && <div className="mt-2 text-[13.5px] font-semibold">{r.title}</div>}
                  <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-bone-2">{r.body}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {r.status !== "APPROVED" && (
                      <button className="a-btn a-btn-sm a-btn-gold" disabled={busyId === r.id} onClick={() => setStatus(r, "APPROVED")}>
                        {busyId === r.id ? <Spinner /> : <Check />} Approve
                      </button>
                    )}
                    {r.status !== "REJECTED" && (
                      <button className="a-btn a-btn-sm" disabled={busyId === r.id} onClick={() => setStatus(r, "REJECTED")}>
                        <X /> Reject
                      </button>
                    )}
                    {r.status !== "PENDING" && (
                      <button className="a-btn a-btn-sm a-btn-ghost" disabled={busyId === r.id} onClick={() => setStatus(r, "PENDING")}>
                        Back to pending
                      </button>
                    )}
                    {isAdmin && (
                      <ConfirmButton className="a-btn a-btn-sm a-btn-ghost a-btn-icon ml-auto" ariaLabel="Delete review" title="Delete this review?" confirmLabel="Delete" onConfirm={() => remove(r)}>
                        <Trash2 />
                      </ConfirmButton>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} pages={pages} total={total} />
    </div>
  );
}
