import { z } from "zod";
import { ok } from "@/lib/api";
import { adminRoute, readJson, revalidateCatalog } from "@/lib/admin-api";
import { db } from "@/lib/db";
import { aiRewriteDescription, aiSeo, aiTags } from "@/lib/admin-ai";
import { auditProduct } from "../seo-audit/audit";

export const runtime = "nodejs";
export const maxDuration = 300;

const schema = z.object({ ids: z.array(z.string().min(1).max(40)).min(1).max(5) });

const FULL_SELECT = {
  id: true, name: true, slug: true, modelNumber: true, gender: true, price: true,
  movement: true, display: true, caseMaterial: true, caseSize: true, caseShape: true, dialColor: true,
  strapMaterial: true, strapColor: true, glass: true, waterResistance: true, features: true, warranty: true,
  shortDescription: true, description: true, highlights: true, tags: true, seoTitle: true, seoDesc: true,
  brand: { select: { name: true } },
  images: { orderBy: { position: "asc" }, select: { id: true, url: true, alt: true } },
};

async function fixOne(id) {
  const p = await db.product.findUnique({ where: { id }, select: FULL_SELECT });
  if (!p) return { id, ok: false, error: "Product not found" };
  const issues = auditProduct(p);
  const fixed = [];
  const data = {};

  if (issues.some((i) => i.startsWith("seoTitle") || i.startsWith("seoDesc"))) {
    const seo = await aiSeo(p);
    if (seo.seoTitle) data.seoTitle = seo.seoTitle;
    if (seo.seoDesc) data.seoDesc = seo.seoDesc;
    if (!p.shortDescription && seo.shortDescription) data.shortDescription = seo.shortDescription;
    fixed.push("seo");
  }
  if (issues.includes("desc-missing") || issues.includes("desc-short")) {
    const r = await aiRewriteDescription({ ...p, ...data });
    if (r.description) data.description = r.description;
    if (r.highlights?.length && (!p.highlights?.length || p.highlights.length < 3)) data.highlights = r.highlights;
    fixed.push("description");
  }
  if (issues.includes("tags-few")) {
    const r = await aiTags({ ...p, ...data });
    data.tags = [...new Set([...(p.tags || []), ...(r.tags || [])])].slice(0, 30);
    fixed.push("tags");
  }

  const altFixes = [];
  if (issues.includes("alt-missing")) {
    const base = `${p.brand?.name ? `${p.brand.name} ` : ""}${p.name}`.trim().slice(0, 170);
    p.images.forEach((im, i) => {
      if (!im.alt || !im.alt.trim()) altFixes.push(db.productImage.update({ where: { id: im.id }, data: { alt: `${base} — view ${i + 1}` } }));
    });
    fixed.push("alt");
  }

  if (Object.keys(data).length || altFixes.length) {
    await db.$transaction([...(Object.keys(data).length ? [db.product.update({ where: { id }, data })] : []), ...altFixes]);
  }
  const after = auditProduct({ ...p, ...data, images: p.images.map((im) => ({ ...im, alt: im.alt || "x" })) });
  return { id, slug: p.slug, ok: true, fixed, remaining: after };
}

/** POST {ids} → { results: [{id, ok, fixed, remaining, error}] } */
export const POST = adminRoute(
  async (req) => {
    const { ids } = await readJson(req, schema);
    const results = [];
    for (const id of ids) {
      try {
        results.push(await fixOne(id));
      } catch (e) {
        results.push({ id, ok: false, error: e?.message?.slice(0, 200) || "AI fix failed" });
      }
    }
    revalidateCatalog(results.filter((r) => r.ok).map((r) => r.slug));
    return ok({ results });
  },
  { ai: true }
);
