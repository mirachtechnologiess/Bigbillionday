"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Bot, MessageCircleQuestion, User } from "lucide-react";
import { toast } from "sonner";
import { Card, CopyButton } from "../ui";
import { api } from "../fetcher";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Which products should I restock this week?",
  "What was my revenue last 7 days vs previous?",
  "Which pincodes cancel most?",
  "Which brands sell best?",
];

/** Reveals text progressively, like typing. */
function Typewriter({ text, onDone }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const step = Math.max(2, Math.round(text.length / 160));
    const t = setInterval(() => setN((x) => Math.min(text.length, x + step)), 16);
    return () => clearInterval(t);
  }, [text]);
  useEffect(() => {
    if (n >= text.length && text.length) onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);
  return <span className={cn(n < text.length && "ai-caret")}>{text.slice(0, n)}</span>;
}

export default function AskStore({ aiOn }) {
  const [q, setQ] = useState("");
  const [thread, setThread] = useState([]); // {role, text, typed}
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [thread, busy]);

  const ask = async (question) => {
    const text = String(question || q).trim();
    if (text.length < 3 || busy) return;
    setQ("");
    setThread((t) => [...t, { role: "user", text }]);
    setBusy(true);
    try {
      const r = await api("/api/admin/ai-studio/ask", { method: "POST", body: { question: text } });
      setThread((t) => [...t, { role: "ai", text: r.answer, typed: false }]);
    } catch (e) {
      toast.error(e.message);
      setThread((t) => [...t, { role: "ai", text: `Sorry, I could not answer that: ${e.message}`, typed: true, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Ask your store" icon={MessageCircleQuestion} bodyClass="flex flex-col gap-4">
      <p className="text-[12px] text-mute">
        Answers come only from a read-only snapshot of your metrics (orders, revenue, stock, brands, pincodes, reviews). The model never queries the database directly.
      </p>

      <div className="min-h-[260px] space-y-4 rounded-xl border border-line bg-ink/60 p-4">
        {!thread.length && (
          <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center">
            <Bot className="h-6 w-6 text-gold" />
            <div className="font-display text-xl">What would you like to know?</div>
            <p className="text-[12px] text-mute">Pick a suggestion or type your own question.</p>
          </div>
        )}
        {thread.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
            <div className={cn("grid h-7 w-7 flex-none place-items-center rounded-full border", m.role === "user" ? "border-line-2 bg-ink-3" : "border-gold/40 bg-gold/10")}>
              {m.role === "user" ? <User className="h-3.5 w-3.5 text-bone-2" /> : <Bot className="h-3.5 w-3.5 text-gold" />}
            </div>
            <div
              className={cn(
                "group relative max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                m.role === "user" ? "bg-gold-3 text-bone" : m.error ? "border border-danger/30 bg-danger/5 text-bone-2" : "border border-line bg-ink-3 text-bone"
              )}
            >
              {m.role === "ai" && !m.typed ? (
                <Typewriter text={m.text} onDone={() => setThread((t) => t.map((x, j) => (j === i ? { ...x, typed: true } : x)))} />
              ) : (
                m.text
              )}
              {m.role === "ai" && m.typed && !m.error && (
                <div className="mt-2 flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
                  <CopyButton text={m.text} label="Copy" />
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {busy && (
          <div className="flex gap-3">
            <div className="grid h-7 w-7 place-items-center rounded-full border border-gold/40 bg-gold/10">
              <Bot className="h-3.5 w-3.5 text-gold" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl border border-line bg-ink-3 px-3.5 py-3">
              {[0, 1, 2].map((d) => (
                <motion.span key={d} className="h-1.5 w-1.5 rounded-full bg-gold" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: d * 0.15 }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" disabled={busy || !aiOn} onClick={() => ask(s)} className="rounded-full border border-line-2 px-2.5 py-1 text-[11.5px] text-bone-2 transition-colors hover:border-gold hover:text-gold-2 disabled:opacity-40">
            {s}
          </button>
        ))}
      </div>

      <form method="post"
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
      >
        <input className="a-input flex-1" value={q} maxLength={500} onChange={(e) => setQ(e.target.value)} placeholder={aiOn ? "Ask about revenue, stock, brands, cancellations…" : "AI is not configured"} disabled={!aiOn} />
        <button className="a-btn a-btn-gold a-btn-icon" type="submit" disabled={busy || q.trim().length < 3 || !aiOn} aria-label="Ask">
          <ArrowUp />
        </button>
      </form>
    </Card>
  );
}
