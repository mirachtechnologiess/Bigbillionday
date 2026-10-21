"use client";

import { useState } from "react";
import { Camera, MessageCircleQuestion, PenLine, SearchCheck, ShieldCheck, Sparkles } from "lucide-react";
import { PageHeader, Pill, Tabs } from "../ui";
import { cn } from "@/lib/utils";
import PhotoDrafts from "./PhotoDrafts";
import SeoFixer from "./SeoFixer";
import ReviewModeration from "./ReviewModeration";
import Copywriter from "./Copywriter";
import AskStore from "./AskStore";

const TABS = [
  { value: "photos", label: "Photos → Drafts", icon: Camera },
  { value: "seo", label: "SEO fixer", icon: SearchCheck },
  { value: "reviews", label: "Review moderation", icon: ShieldCheck },
  { value: "copy", label: "Copywriter", icon: PenLine },
  { value: "ask", label: "Ask your store", icon: MessageCircleQuestion },
];

export default function AiStudio({ initialTab, aiOn, home, autoModeration, reviews }) {
  const [tab, setTab] = useState(initialTab);
  const change = (t) => {
    setTab(t);
    // shallow URL update (no server round-trip) so the tab is shareable and survives reload
    const url = new URL(window.location.href);
    if (t === "photos") url.searchParams.delete("tab");
    else url.searchParams.set("tab", t);
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <div>
      <PageHeader
        eyebrow="Atelier · AI"
        title="AI Studio"
        description="Turn photos into listings, repair SEO in bulk, moderate reviews, rewrite the homepage and interrogate your numbers."
        actions={aiOn ? <Pill tone="lume">AI online</Pill> : <Pill tone="danger">AI not configured</Pill>}
      />
      {!aiOn && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-ember/30 bg-ember/5 p-3 text-[12.5px] text-bone-2">
          <Sparkles className="mt-0.5 h-4 w-4 flex-none text-ember" />
          <span>
            AI features need an NVIDIA API key (add it in Settings → AI). Tools that call the model will return an error until it is set.
          </span>
        </div>
      )}
      <Tabs tabs={TABS.map((t) => (t.value === "reviews" ? { ...t, count: reviews.pending } : t))} value={tab} onChange={change} className="mb-5" />
      {/* Panels stay mounted so a running photo queue survives tab switches. */}
      <div className={cn(tab !== "photos" && "hidden")}>
        <PhotoDrafts aiOn={aiOn} />
      </div>
      <div className={cn(tab !== "seo" && "hidden")}>
        <SeoFixer aiOn={aiOn} active={tab === "seo"} />
      </div>
      <div className={cn(tab !== "reviews" && "hidden")}>
        <ReviewModeration aiOn={aiOn} autoModeration={autoModeration} reviews={reviews} />
      </div>
      <div className={cn(tab !== "copy" && "hidden")}>
        <Copywriter aiOn={aiOn} home={home} />
      </div>
      <div className={cn(tab !== "ask" && "hidden")}>
        <AskStore aiOn={aiOn} />
      </div>
    </div>
  );
}
