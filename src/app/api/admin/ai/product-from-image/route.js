import { z } from "zod";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute, readJson } from "@/lib/admin-api";
import { readImageBuffer, assertImage } from "@/lib/admin-products";
import { productFromImage } from "@/lib/admin-ai";

export const runtime = "nodejs";
export const maxDuration = 120;

const schema = z.object({
  imageUrl: z.string().min(1).max(1000),
  imageCount: z.coerce.number().int().min(1).max(8).optional().default(1),
  hint: z.string().max(300).optional().default(""),
});

/**
 * Photo → full product draft.
 * 1. vision model (Nemotron 3.5 Super VL) reads the photo → attributes constrained to WATCH_ATTRS, normalised server-side
 * 2. text model (Nemotron 3 Super) writes name, copy, SEO, tags, alt texts, price-band hint
 * Nothing is saved here — the editor shows the result for review.
 */
export const POST = adminRoute(
  async (req) => {
    const { imageUrl, imageCount, hint } = await readJson(req, schema);
    const buffer = await readImageBuffer(imageUrl);
    await assertImage(buffer, 15 * 1024 * 1024);
    const brands = await db.brand.findMany({ select: { id: true, name: true } });
    const result = await productFromImage(buffer, { brands, imageCount, hint });
    return ok(result);
  },
  { ai: true }
);
