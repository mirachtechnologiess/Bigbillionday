import { z } from "zod";
import { BANNER_THEMES } from "@/lib/admin-banners";

export const PLACEMENTS = ["home_hero", "home_strip", "home_promo", "collection_top"];
export const THEMES = BANNER_THEMES;

const optText = (max) => z.preprocess((v) => (v === undefined ? undefined : String(v ?? "").trim() || null), z.string().max(max).nullable().optional());

/** "" / null → null, ISO or datetime-local string → Date. */
const optDate = z.preprocess(
  (v) => (v === undefined ? undefined : v === null || String(v).trim() === "" ? null : new Date(v)),
  z.date({ invalid_type_error: "Invalid date" }).nullable().optional()
);

export const bannerBase = z.object({
  title: z.string().trim().min(1, "Title is required").max(140),
  subtitle: optText(300),
  image: optText(500),
  ctaLabel: optText(40),
  ctaHref: z.preprocess(
    (v) => (v === undefined ? undefined : String(v ?? "").trim() || null),
    z.string().max(500).regex(/^(\/|https?:\/\/)/, "Link must start with / or http(s)://").nullable().optional()
  ),
  badge: z.preprocess((v) => (v === undefined ? undefined : String(v ?? "").replace(/\s+/g, " ").trim() || null), z.string().max(40).nullable().optional()),
  theme: z.enum(THEMES).default("saffron"),
  productId: optText(40),
  startsAt: optDate,
  endsAt: optDate,
  placement: z.enum(PLACEMENTS).default("home_hero"),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(-100000).max(100000).optional(),
});
