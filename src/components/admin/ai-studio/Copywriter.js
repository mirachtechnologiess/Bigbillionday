"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, PenLine, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, Field, Spinner } from "../ui";
import { api } from "../fetcher";
import { cn } from "@/lib/utils";

const BRIEFS = ["Diwali sale, up to 40% off", "Wedding season gifting", "New automatic arrivals", "Calm, minimal, luxury"];

function HeroPreview({ v }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-ink p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(400px_160px_at_80%_0%,rgb(242_96_12/.08),transparent)]" />
      {v.announcement && <div className="mb-3 truncate border-b border-line pb-2 text-center font-mono text-[10px] uppercase tracking-[.16em] text-gold-2">{v.announcement}</div>}
      <div className="whitespace-pre-line font-display text-[24px] leading-[1.05] text-bone">{v.heroTitle || "—"}</div>
      <p className="mt-2 text-[12px] text-bone-2">{v.heroSubtitle}</p>
    </div>
  );
}

function OptionCard({ initial, index, onApply, applying }) {
  const [v, setV] = useState(initial);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="a-card flex flex-col gap-3 p-3.5"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-gold-3">Option {index + 1}</span>
      </div>
      <HeroPreview v={v} />
      <Field label="Hero title" counter={v.heroTitle.length} max={60}>
        <textarea className="a-input !min-h-[56px]" rows={2} value={v.heroTitle} onChange={set("heroTitle")} />
      </Field>
      <Field label="Subtitle" counter={v.heroSubtitle.length} max={140}>
        <textarea className="a-input !min-h-[56px]" rows={2} value={v.heroSubtitle} onChange={set("heroSubtitle")} />
      </Field>
      <Field label="Announcement bar" counter={v.announcement.length} max={100}>
        <input className="a-input" value={v.announcement} onChange={set("announcement")} />
      </Field>
      <button className="a-btn a-btn-gold mt-auto" disabled={applying || !v.heroTitle.trim()} onClick={() => onApply(v)}>
        {applying ? <Spinner /> : <Check />} Use this
      </button>
    </motion.div>
  );
}

export default function Copywriter({ aiOn, home: initialHome }) {
  const [home, setHome] = useState(initialHome);
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState([]);
  const [batch, setBatch] = useState(0);
  const [applying, setApplying] = useState(false);

  const generate = async () => {
    setBusy(true);
    try {
      const r = await api("/api/admin/ai-studio/copywriter", { method: "POST", body: { brief } });
      if (!r.options?.length) toast.message("No usable options came back. Try again.");
      setOptions(r.options || []);
      setBatch((b) => b + 1);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const apply = async (v) => {
    setApplying(true);
    try {
      const r = await api("/api/admin/ai-studio/copywriter/apply", {
        method: "POST",
        body: { heroTitle: v.heroTitle.trim(), heroSubtitle: v.heroSubtitle.trim(), announcement: v.announcement.trim() },
      });
      setHome(r.home);
      toast.success("Homepage copy updated");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card title="Live on the homepage" icon={PenLine}>
          <HeroPreview v={home} />
        </Card>
        <Card title="Brief" icon={Sparkles} bodyClass="space-y-3">
          <Field label="What should the copy feel like?" hint="Optional. Occasion, offer, mood or audience.">
            <textarea className="a-input" rows={3} maxLength={400} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g. Diwali festive sale, gifting for him, COD everywhere" />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {BRIEFS.map((b) => (
              <button key={b} type="button" onClick={() => setBrief(b)} className="rounded-md border border-dashed border-line-2 px-2 py-0.5 text-[11.5px] text-mute hover:border-gold hover:text-gold-2">
                {b}
              </button>
            ))}
          </div>
          <button className="a-btn a-btn-ai" onClick={generate} disabled={busy || !aiOn}>
            {busy ? <Spinner /> : <Sparkles />} {busy ? "Writing four options…" : options.length ? "Generate again" : "Generate"}
          </button>
        </Card>
      </div>

      {busy && !options.length && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="a-card a-scan h-[380px]" />
          ))}
        </div>
      )}
      {options.length > 0 && (
        <div className={cn("grid gap-3 md:grid-cols-2 xl:grid-cols-4", busy && "opacity-50")}>
          {options.map((o, i) => (
            <OptionCard key={`${batch}-${i}`} initial={o} index={i} onApply={apply} applying={applying} />
          ))}
        </div>
      )}
    </div>
  );
}
