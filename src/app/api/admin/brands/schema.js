import { z } from "zod";
import { slugify } from "@/lib/utils";

const optText = (max) => z.preprocess((v) => (v === undefined ? undefined : String(v ?? "").trim() || null), z.string().max(max).nullable().optional());

export const brandBase = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  slug: z.preprocess((v) => (v === undefined ? undefined : slugify(String(v ?? ""))), z.string().max(90).optional()),
  logo: optText(500),
  description: optText(4000),
  country: optText(60),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(-100000).max(100000).optional(),
  seoTitle: optText(70),
  seoDesc: optText(170),
});
