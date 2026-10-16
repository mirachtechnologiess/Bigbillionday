"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lightbulb, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, Pill, Spinner, timeAgo } from "../ui";
import { api } from "../fetcher";

const KEY = "ps-admin-insights-v1";
const TONE = { high: "ember", medium: "gold", low: "mute" };

export default function AiInsights({ aiOn }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {}
  }, []);

  const run = async () => {
    setBusy(true);
    try {
      const r = await api("/api/admin/ai/insights", { method: "POST" });
      const next = { insights: r.insights || [], at: r.generatedAt || new Date().toISOString() };
      setData(next);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      if (!next.insights.length) toast.message("The analyst came back empty-handed. Try again.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="AI insights"
      icon={Sparkles}
      actions={
        <>
          {data?.at && <span className="hidden text-[11px] text-mute sm:inline">Generated {timeAgo(data.at)}</span>}
          <button className="a-btn a-btn-ai a-btn-sm" onClick={run} disabled={busy || !aiOn} title={aiOn ? undefined : "AI is not configured"}>
            {busy ? <Spinner /> : data ? <RefreshCw /> : <Sparkles />}
            {busy ? "Analysing…" : data ? "Regenerate" : "Generate insights"}
          </button>
        </>
      }
    >
      {!data?.insights?.length ? (
        <div className="a-dots flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-2 px-6 py-10 text-center">
          <Lightbulb className="h-5 w-5 text-gold" />
          <div className="font-display text-xl">Five moves for this week</div>
          <p className="max-w-md text-[12.5px] text-mute">
            {aiOn
              ? "Let the analyst read your last 30 days (sellers, slow movers, stock-outs, cancellations by pincode) and suggest what to do next."
              : "Set NVIDIA_API_KEY to enable AI insights."}
          </p>
          {busy && <div className="a-scan mt-2 h-1 w-40 rounded bg-ink-4" />}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.insights.map((x, i) => (
            <motion.div
              key={`${data.at}-${i}`}
              initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: i * 0.09, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="relative rounded-xl border border-line bg-ink-3/60 p-3.5"
            >
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <span className="font-mono text-[10.5px] text-gold-3">0{i + 1}</span>
                <Pill tone={TONE[x.impact] || "mute"}>{x.impact}</Pill>
              </div>
              <div className="text-[13.5px] font-semibold leading-snug text-bone">{x.title}</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-bone-2">{x.detail}</p>
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  );
}
