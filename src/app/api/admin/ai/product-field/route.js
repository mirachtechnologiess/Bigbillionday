import { z } from "zod";
import { ok } from "@/lib/api";
import { adminRoute, readJson } from "@/lib/admin-api";
import { readImageBuffer } from "@/lib/admin-products";
import { aiSeo, aiTags, aiRewriteDescription, aiHighlights, aiAltText, aiTranslate } from "@/lib/admin-ai";

export const runtime = "nodejs";
export const maxDuration = 90;

const schema = z.object({
  task: z.enum(["seo", "tags", "description", "highlights", "alt", "translate"]),
  tone: z.enum(["premium", "playful", "minimal", "technical", "festive"]).optional().default("premium"),
  lang: z.enum(["Tamil", "Hindi"]).optional().default("Tamil"),
  imageUrls: z.array(z.string().max(1000)).max(10).optional().default([]),
  // current (unsaved) form state from the editor
  product: z
    .object({
      name: z.string().max(200).optional().default(""),
      brandName: z.string().max(80).optional().nullable(),
      modelNumber: z.string().max(80).optional().nullable(),
      gender: z.string().optional().nullable(),
      price: z.coerce.number().optional().nullable(),
      movement: z.string().optional().nullable(),
      display: z.string().optional().nullable(),
      caseMaterial: z.string().optional().nullable(),
      caseSize: z.coerce.number().optional().nullable(),
      caseShape: z.string().optional().nullable(),
      dialColor: z.string().optional().nullable(),
      strapMaterial: z.string().optional().nullable(),
      strapColor: z.string().optional().nullable(),
      glass: z.string().optional().nullable(),
      waterResistance: z.string().optional().nullable(),
      features: z.array(z.string()).optional().default([]),
      warranty: z.string().optional().nullable(),
      shortDescription: z.string().max(400).optional().nullable(),
      description: z.string().max(20000).optional().nullable(),
    })
    .passthrough(),
});

export const POST = adminRoute(
  async (req) => {
    const { task, tone, lang, imageUrls, product } = await readJson(req, schema);
    switch (task) {
      case "seo":
        return ok(await aiSeo(product));
      case "tags":
        return ok(await aiTags(product));
      case "description":
        return ok(await aiRewriteDescription(product, tone));
      case "highlights":
        return ok(await aiHighlights(product));
      case "translate":
        return ok(await aiTranslate(product, lang));
      case "alt": {
        const alts = [];
        for (const url of imageUrls.slice(0, 8)) {
          try {
            alts.push(await aiAltText(await readImageBuffer(url), product));
          } catch {
            alts.push(null);
          }
        }
        return ok({ alts });
      }
    }
  },
  { ai: true }
);
