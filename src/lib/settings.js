import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "./db";

/** Defaults for every store setting. Admin > Settings overrides these (stored in the Setting table). */
export const DEFAULT_SETTINGS = {
  store: {
    name: "BigBillionDay",
    tagline: "Time, curated.",
    email: "support@bigbillionday.store",
    phone: "",
    whatsapp: "",
    address: "",
    gstin: "",
    instagram: "https://www.instagram.com/premium_shopy_/",
    facebook: "",
    youtube: "",
  },
  shipping: {
    freeShippingAbove: 999,
    flatFee: 79,
    etaDays: "3-7",
    serviceablePincodes: "", // comma separated prefixes; empty = all India
  },
  payment: {
    codEnabled: true,
    codFee: 0,
    codMaxOrder: 200000,
    razorpayEnabled: false, // "coming soon" until switched on
  },
  seo: {
    title: "BigBillionDay — Watches for Men & Women at Best Prices | Cash on Delivery",
    description:
      "Shop stylish watches for men & women — analog, digital and smart watches at unbeatable prices. Cash on Delivery across India, easy returns.",
    keywords: "watches, luxury watches, men watches, women watches, automatic watch, chronograph, buy watches online india, cod watches",
    ogImage: "/og-default.jpg",
  },
  home: {
    heroTitle: "Time, Engineered\nInto Art.",
    heroSubtitle: "Every brand. Every movement. Delivered to your door — pay when it arrives.",
    announcement: "Free shipping above ₹999 · Cash on Delivery across India",
  },
  ai: {
    autoSeo: true,
    autoAltText: true,
    autoReviewModeration: false,
    codRiskScoring: true,
    concierge: true,
  },
};

function merge(base, over) {
  const out = { ...base };
  for (const k of Object.keys(over || {})) {
    out[k] = over[k] && typeof over[k] === "object" && !Array.isArray(over[k]) ? merge(base[k] || {}, over[k]) : over[k];
  }
  return out;
}

/** All settings merged over defaults. Cached per request. */
const loadSettings = unstable_cache(
  async () => {
    const rows = await db.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },
  ["settings"],
  { tags: ["settings"], revalidate: 300 }
);

export const getSettings = cache(async () => {
  try {
    return merge(DEFAULT_SETTINGS, await loadSettings());
  } catch {
    return DEFAULT_SETTINGS;
  }
});

export async function saveSettingGroup(key, value) {
  if (!(key in DEFAULT_SETTINGS)) throw new Error(`Unknown settings group: ${key}`);
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}
