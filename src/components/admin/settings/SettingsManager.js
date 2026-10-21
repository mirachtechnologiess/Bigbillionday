"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bot, CreditCard, Home, KeyRound, Lock, RotateCcw, Save, Search, Sparkles, Store, Truck } from "lucide-react";
import { api } from "@/components/admin/fetcher";
import { Card, Field, ImagePicker, PageHeader, Pill, Spinner, Tabs, Toggle, useQueryState } from "@/components/admin/ui";
import { cn, formatINR } from "@/lib/utils";
import { SeoPreview } from "@/components/admin/brands/shared";
import NvidiaKeyCard from "@/components/admin/settings/NvidiaKeyCard";

const GROUPS = {
  store: { label: "Store", icon: Store, blurb: "Identity and contact details shown in the header, footer, invoices and emails." },
  shipping: { label: "Shipping", icon: Truck, blurb: "Delivery fees, free-shipping threshold and where you ship." },
  payment: { label: "Payment", icon: CreditCard, blurb: "Checkout payment methods and Cash-on-Delivery rules." },
  seo: { label: "SEO", icon: Search, blurb: "Default title, description and share image for pages without their own." },
  home: { label: "Homepage", icon: Home, blurb: "Hero copy and the announcement bar." },
  ai: { label: "AI", icon: Sparkles, blurb: "Automations powered by the NVIDIA-hosted models." },
};

/** Labels, hints and input hints per key. Anything missing falls back to a humanised key + type-derived input. */
const META = {
  store: {
    name: { label: "Store name" },
    tagline: { label: "Tagline", hint: "Short line used under the logo and in emails." },
    email: { label: "Support email", type: "email" },
    phone: { label: "Phone", type: "tel", placeholder: "+91 98765 43210" },
    whatsapp: { label: "WhatsApp number", hint: "Digits with country code, e.g. 919876543210 — powers the WhatsApp chat button.", placeholder: "919876543210" },
    address: { label: "Business address", textarea: true, wide: true },
    gstin: { label: "GSTIN", hint: "Printed on invoices.", placeholder: "29ABCDE1234F1Z5", mono: true },
    instagram: { label: "Instagram URL", type: "url" },
    facebook: { label: "Facebook URL", type: "url" },
    youtube: { label: "YouTube URL", type: "url" },
  },
  shipping: {
    freeShippingAbove: { label: "Free shipping above", money: true, hint: "Orders at or above this subtotal ship free. 0 = always free." },
    flatFee: { label: "Flat shipping fee", money: true, hint: "Charged below the free-shipping threshold." },
    etaDays: { label: "Delivery estimate (days)", hint: "Shown on product pages, e.g. 3-7.", placeholder: "3-7" },
    serviceablePincodes: { label: "Serviceable pincodes", textarea: true, wide: true, mono: true, hint: "Comma-separated pincode prefixes (e.g. 560, 600, 110001). Leave empty to deliver across India." },
  },
  payment: {
    codEnabled: { label: "Cash on Delivery", hint: "Let customers pay when the watch arrives." },
    codFee: { label: "COD handling fee", money: true, hint: "Added to COD orders. 0 = free." },
    codMaxOrder: { label: "COD order limit", money: true, hint: "Orders above this total must be prepaid." },
    razorpayEnabled: { label: "Razorpay (UPI / cards / netbanking)", hint: "Online payments via Razorpay." },
  },
  seo: {
    title: { label: "Default title", max: 60, wide: true },
    description: { label: "Meta description", max: 155, textarea: true, wide: true },
    keywords: { label: "Keywords", textarea: true, wide: true, hint: "Comma separated. Minor ranking signal; useful for internal search hints." },
    ogImage: { label: "Social share image", image: true, wide: true, hint: "1200×630 recommended. Used when links are shared on WhatsApp, Instagram, X…" },
  },
  home: {
    heroTitle: { label: "Hero title", textarea: true, wide: true, display: true, hint: "Press Enter for a line break." },
    heroSubtitle: { label: "Hero subtitle", textarea: true, wide: true },
    announcement: { label: "Announcement bar", wide: true, hint: "Leave empty to hide the bar." },
  },
  ai: {
    autoSeo: { label: "Auto SEO", hint: "Fill missing SEO titles & meta descriptions when products are saved." },
    autoAltText: { label: "Auto alt text", hint: "Describe uploaded product photos for accessibility and image search." },
    autoReviewModeration: { label: "Review moderation", hint: "Auto-approve clearly positive reviews and flag spam/abuse for a human. Off = every review waits for approval." },
    codRiskScoring: { label: "COD risk scoring", hint: "Score new COD orders 0–100 for RTO / fake-order risk so you can call before shipping." },
    concierge: { label: "Watch concierge", hint: "Storefront chat assistant that recommends watches from your live catalog." },
  },
};

const humanize = (k) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function SettingsManager({ initial, defaults, tab: initialTab, isAdmin, razorpayReady, aiConfigured }) {
  const router = useRouter();
  const { set: setQuery } = useQueryState();
  const [tab, setTab] = useState(initialTab);
  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);

  const dirtyGroups = Object.keys(GROUPS).filter((g) => !same(values[g], saved[g]));
  const dirty = dirtyGroups.includes(tab);

  const change = (key, v) => setValues((s) => ({ ...s, [tab]: { ...s[tab], [key]: v } }));
  const switchTab = (t) => {
    setTab(t);
    setQuery({ tab: t === "store" ? null : t });
  };

  const save = useCallback(async () => {
    if (!isAdmin) return toast.error("Only an ADMIN can change settings");
    if (same(values[tab], saved[tab])) return toast.info("Nothing to save");
    setBusy(true);
    try {
      const value = Object.fromEntries(Object.entries(values[tab]).map(([k, v]) => [k, typeof defaults[tab][k] === "number" ? (v === "" ? 0 : Number(v)) : v]));
      if (tab === "payment" && !razorpayReady) value.razorpayEnabled = false;
      const r = await api("/api/admin/settings", { method: "PUT", body: { key: tab, value } });
      setSaved((s) => ({ ...s, [tab]: r.value }));
      setValues((s) => ({ ...s, [tab]: r.value }));
      toast.success(`${GROUPS[tab].label} settings saved`);
      router.refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }, [isAdmin, values, saved, tab, defaults, router, razorpayReady]);

  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!dirtyGroups.length) return;
    const h = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirtyGroups.length]);

  const v = values[tab];
  const meta = META[tab] || {};
  const keys = Object.keys(defaults[tab]);

  return (
    <div>
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Store-wide configuration. Changes go live immediately after saving."
        actions={!isAdmin && <Pill tone="mute"><Lock className="h-3 w-3" /> View only — ADMIN can edit</Pill>}
      />

      <Tabs
        className="mb-4"
        value={tab}
        onChange={switchTab}
        tabs={Object.entries(GROUPS).map(([k, g]) => ({
          value: k,
          icon: g.icon,
          label: (
            <>
              {g.label}
              {dirtyGroups.includes(k) && <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-label="unsaved changes" />}
            </>
          ),
        }))}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card title={`${GROUPS[tab].label}`} icon={GROUPS[tab].icon} actions={dirty && <Pill tone="gold">Unsaved changes</Pill>} bodyClass="!p-0">
          <p className="border-b border-line px-4 py-3 text-[12.5px] text-mute">{GROUPS[tab].blurb}</p>

          {tab === "ai" && <NvidiaKeyCard isAdmin={isAdmin} />}

          <fieldset disabled={!isAdmin} className="grid gap-x-4 gap-y-5 p-4 sm:grid-cols-2">
            {keys.map((k) => (
              <SettingField
                key={`${tab}.${k}`}
                group={tab}
                name={k}
                def={defaults[tab][k]}
                meta={meta[k] || {}}
                value={v[k]}
                onChange={(val) => change(k, val)}
                razorpayReady={razorpayReady}
                aiConfigured={aiConfigured}
              />
            ))}
          </fieldset>

          <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 rounded-b-2xl border-t border-line bg-ink-2/95 p-3 backdrop-blur">
            <span className="mr-auto hidden text-[11.5px] text-mute sm:block">
              <span className="a-kbd">Ctrl</span> + <span className="a-kbd">S</span> to save
            </span>
            {dirty && (
              <button type="button" className="a-btn a-btn-ghost" onClick={() => setValues((s) => ({ ...s, [tab]: saved[tab] }))} disabled={busy}>
                <RotateCcw /> Discard
              </button>
            )}
            <button type="button" className="a-btn a-btn-gold" onClick={save} disabled={busy || !dirty || !isAdmin}>
              {busy ? <Spinner /> : <Save />} Save {GROUPS[tab].label}
            </button>
          </div>
        </Card>

        <aside className="grid content-start gap-4">
          <SidePreview tab={tab} v={v} />
        </aside>
      </div>
    </div>
  );
}

function SettingField({ group, name, def, meta, value, onChange, razorpayReady, aiConfigured }) {
  const label = meta.label || humanize(name);

  if (typeof def === "boolean") {
    const isRazorpay = group === "payment" && name === "razorpayEnabled";
    const locked = isRazorpay && !razorpayReady;
    return (
      <div className={cn("rounded-xl border border-line bg-ink/40 p-3", "sm:col-span-2")}>
        <div className="flex items-start justify-between gap-3">
          <Toggle checked={!!value && !locked} onChange={onChange} disabled={locked} label={label} hint={meta.hint} />
          {isRazorpay && (razorpayReady ? <Pill tone="lume">Keys detected</Pill> : <Pill tone="gold">Coming soon</Pill>)}
          {group === "ai" && !aiConfigured && <Pill tone="mute">Needs key</Pill>}
        </div>
        {locked && (
          <p className="mt-2 pl-12 text-[11.5px] text-mute">
            Add <code className="font-mono text-bone-2">RAZORPAY_KEY_ID</code> and <code className="font-mono text-bone-2">RAZORPAY_KEY_SECRET</code> to the server environment to enable online payments.
          </p>
        )}
      </div>
    );
  }

  if (typeof def === "number") {
    return (
      <Field label={label} hint={meta.hint}>
        <div className="relative">
          {meta.money && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-mute">₹</span>}
          <input className={cn("a-input a-num", meta.money && "!pl-7")} type="number" min={0} step={1} inputMode="numeric" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
        </div>
      </Field>
    );
  }

  const str = value ?? "";
  if (meta.image) {
    return (
      <div className="sm:col-span-2">
        <Field label={label} hint={meta.hint}>
          <input className="a-input font-mono text-[12px]" value={str} onChange={(e) => onChange(e.target.value)} placeholder="/og-default.jpg" />
        </Field>
        <ImagePicker value={str} onChange={(url) => onChange(url || def)} folder="misc" aspect="aspect-[1200/630]" className="mt-2 max-w-sm" label="Upload share image" />
      </div>
    );
  }

  const long = meta.textarea || String(def).length > 80;
  return (
    <Field label={label} hint={meta.hint} counter={meta.max ? str.length : undefined} max={meta.max} className={meta.wide || long ? "sm:col-span-2" : undefined}>
      {long ? (
        <textarea
          className={cn("a-input min-h-[84px] py-2", meta.mono && "font-mono text-[12px]", meta.display && "font-display text-[20px] leading-tight")}
          rows={meta.display ? 2 : 3}
          value={str}
          placeholder={meta.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input className={cn("a-input", meta.mono && "font-mono text-[12px]")} type={meta.type || "text"} value={str} placeholder={meta.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

function SidePreview({ tab, v }) {
  if (tab === "seo") {
    return (
      <Card title="Search preview">
        <SeoPreview title={v.title} desc={v.description} path="/" />
      </Card>
    );
  }
  if (tab === "shipping") {
    const free = Number(v.freeShippingAbove) || 0;
    const fee = Number(v.flatFee) || 0;
    return (
      <Card title="How checkout will price it">
        <ul className="grid gap-2 text-[12.5px]">
          {[2499, free > 0 ? free : null, 12999].filter((x, i, a) => x !== null && a.indexOf(x) === i).map((sub) => (
            <li key={sub} className="flex items-center justify-between rounded-lg border border-line bg-ink/40 px-3 py-2">
              <span className="text-mute">Cart {formatINR(sub)}</span>
              <span className="a-num">{free === 0 || sub >= free ? <span className="text-lume">Free shipping</span> : `+ ${formatINR(fee)}`}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11.5px] text-mute">Delivery in {v.etaDays || "—"} days · {String(v.serviceablePincodes || "").trim() ? "Restricted pincodes" : "All India"}</p>
      </Card>
    );
  }
  if (tab === "payment") {
    return (
      <Card title="Checkout options">
        <ul className="grid gap-2 text-[12.5px]">
          <li className="flex items-center justify-between rounded-lg border border-line bg-ink/40 px-3 py-2">
            <span>Cash on Delivery</span>
            {v.codEnabled ? <Pill tone="lume">On</Pill> : <Pill tone="mute">Off</Pill>}
          </li>
          <li className="flex items-center justify-between rounded-lg border border-line bg-ink/40 px-3 py-2">
            <span>Razorpay</span>
            {v.razorpayEnabled ? <Pill tone="lume">On</Pill> : <Pill tone="mute">Off</Pill>}
          </li>
        </ul>
        {v.codEnabled && (
          <p className="mt-3 text-[11.5px] text-mute">
            COD available up to <span className="a-num text-bone-2">{formatINR(v.codMaxOrder)}</span>
            {Number(v.codFee) > 0 ? <> with a <span className="a-num text-bone-2">{formatINR(v.codFee)}</span> fee</> : " at no extra fee"}.
          </p>
        )}
      </Card>
    );
  }
  if (tab === "home") {
    return (
      <Card title="Hero preview">
        <div className="overflow-hidden rounded-xl border border-line bg-ink">
          {v.announcement && <div className="truncate border-b border-line bg-gold/10 px-3 py-1.5 text-center text-[10.5px] text-gold-2">{v.announcement}</div>}
          <div className="bg-saffron px-5 py-8">
            <div className="whitespace-pre-line font-sans text-[28px] font-extrabold leading-[0.95] text-white">{v.heroTitle}</div>
            <p className="mt-2 text-[11.5px] text-white/85">{v.heroSubtitle}</p>
          </div>
        </div>
        <Link href="/admin/banners" className="mt-3 inline-block text-[12px] text-gold hover:underline">
          Manage hero banners →
        </Link>
      </Card>
    );
  }
  if (tab === "ai") {
    return (
      <Card title="Where AI is used" icon={Bot}>
        <p className="text-[12.5px] text-mute">Manual AI tools (product drafts from photos, copywriter, bulk enrich) live in AI Studio and work whenever the key is configured.</p>
        <Link href="/admin/ai-studio" className="a-btn a-btn-ai a-btn-sm mt-3">
          <Sparkles /> Open AI Studio
        </Link>
        <Link href="/admin/ai-logs" className="mt-2 block text-[12px] text-gold hover:underline">
          View AI usage logs →
        </Link>
      </Card>
    );
  }
  return (
    <Card title="Footer preview">
      <div className="rounded-xl border border-line bg-ink p-4">
        <div className="font-display text-xl">{v.name || "Store name"}</div>
        <div className="text-[11.5px] text-gold-2">{v.tagline}</div>
        <div className="mt-3 grid gap-0.5 text-[11.5px] text-mute">
          {v.email && <span>{v.email}</span>}
          {v.phone && <span>{v.phone}</span>}
          {v.address && <span className="whitespace-pre-line">{v.address}</span>}
          {v.gstin && <span className="font-mono">GSTIN {v.gstin}</span>}
        </div>
      </div>
    </Card>
  );
}
