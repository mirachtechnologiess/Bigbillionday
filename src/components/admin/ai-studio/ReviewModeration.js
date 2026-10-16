"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, ShieldCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { Card, Empty, Pill, Spinner, Stat, timeAgo } from "../ui";
import { api } from "../fetcher";

const SENT = { positive: "lume", neutral: "mute", negative: "ember" };

export default function ReviewModeration({ aiOn, autoModeration, reviews }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setBusy(true);
    try {
      const r = await api("/api/admin/reviews/classify", { method: "POST", body: {} });
      setResult(r);
      toast.success(`Classified ${r.processed ?? 0} review${r.processed === 1 ? "" : "s"}`);
      router.refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Pending reviews" value={reviews.pending} sub="awaiting a decision" href="/admin/reviews?status=PENDING" />
        <Stat label="Unclassified" value={reviews.unclassified} sub="no sentiment yet" tone="ember" />
        <div className="a-card flex flex-col justify-between gap-2 p-4">
          <span className="a-label !mb-0">Auto-moderation</span>
          <div className="flex items-center justify-between gap-2">
            {autoModeration ? <Pill tone="lume">On</Pill> : <Pill tone="mute">Off</Pill>}
            <Link href="/admin/settings?tab=ai" className="inline-flex items-center gap-1 text-[11.5px] text-mute hover:text-gold-2">
              Change in settings <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <p className="text-[11.5px] text-mute">{autoModeration ? "New reviews are classified as they arrive." : "Reviews wait for you or a manual run."}</p>
        </div>
      </div>

      <Card
        title="Classify pending reviews"
        icon={ShieldCheck}
        actions={
          <button className="a-btn a-btn-ai a-btn-sm" onClick={run} disabled={busy || !aiOn || !reviews.pending}>
            {busy ? <Spinner /> : <ShieldCheck />} {busy ? "Moderating…" : "Run AI moderation"}
          </button>
        }
      >
        <p className="text-[12.5px] text-mute">
          The model reads each pending review (English, Hindi, Tamil, Tanglish), tags sentiment, approves clean ones and rejects spam or abuse. Borderline cases are flagged for you.
        </p>
        {result && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill tone="info">{result.processed ?? 0} processed</Pill>
            <Pill tone="lume">{result.approved ?? 0} approved</Pill>
            <Pill tone="danger">{result.rejected ?? 0} rejected</Pill>
            <Pill tone="gold">{result.flagged ?? 0} flagged</Pill>
          </div>
        )}
      </Card>

      <Card title="Latest pending" bodyClass="!p-0" actions={<Link href="/admin/reviews?status=PENDING" className="text-[11.5px] text-mute hover:text-gold-2">Open reviews</Link>}>
        {reviews.latest.length ? (
          <ul className="divide-y divide-line">
            {reviews.latest.map((r) => (
              <li key={r.id} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex w-[150px] flex-none items-center gap-2 sm:flex-col sm:items-start">
                  <span className="inline-flex items-center gap-0.5 text-gold">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className="h-3 w-3" fill={i < r.rating ? "currentColor" : "none"} strokeWidth={1.5} />
                    ))}
                  </span>
                  {r.sentiment ? <Pill tone={SENT[r.sentiment] || "mute"}>{r.sentiment}</Pill> : <Pill tone="mute" dot={false}>unclassified</Pill>}
                </div>
                <div className="min-w-0 flex-1">
                  {r.title && <div className="text-[13px] font-semibold">{r.title}</div>}
                  <p className="line-clamp-3 text-[12.5px] text-bone-2">{r.body}</p>
                  <div className="mt-1 text-[11px] text-mute">
                    {r.name}
                    {r.verified && " · verified buyer"} · {timeAgo(r.createdAt)} ·{" "}
                    {r.product ? (
                      <Link href={`/admin/products/${r.product.id}`} className="hover:text-gold-2">
                        {r.product.name}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-4">
            <Empty icon={ShieldCheck} title="Inbox zero">
              No reviews are waiting for moderation.
            </Empty>
          </div>
        )}
      </Card>
    </div>
  );
}
