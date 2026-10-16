import "server-only";
import { ZodError } from "zod";
import { db } from "./db";
import { slugify, WATCH_ATTRS } from "./utils";
import { aiEnabled } from "./ai";
import { aiEnrichRow, normalizeAttr, normalizeGender, sanitizeHtml } from "./admin-ai";
import { ensureBrand, productInput, saveProduct } from "./admin-products";
import { importRemoteImage } from "./storage";
import { IMPORT_KEYS } from "@/components/admin/import/fields";

/* ───────────── Parsers ───────────── */

const str = (v) => (v === null || v === undefined ? "" : String(v).trim());

/** "₹1,999.00" → 1999, "44mm" → 44. null when absent/unparseable. */
export function parseNum(v) {
  const s = str(v).replace(/,/g, "");
  if (!s) return null;
  const m = s.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** yes/true/1/y → true, no/false/0/n → false, else undefined */
export function parseBool(v) {
  const s = str(v).toLowerCase();
  if (/^(yes|y|true|1|on)$/.test(s)) return true;
  if (/^(no|n|false|0|off)$/.test(s)) return false;
  return undefined;
}

export const parseList = (v) =>
  str(v)
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$|\[?f[cd])/i;
function safeRemoteUrl(u) {
  try {
    const url = new URL(u);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (PRIVATE_HOST.test(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

const zodMessage = (e) => {
  const f = e.flatten();
  const parts = Object.entries(f.fieldErrors).map(([k, v]) => `${k}: ${v?.[0]}`);
  return [...f.formErrors, ...parts].join("; ") || "Validation failed";
};

/* ───────────── Row → product input ───────────── */

const SPEC_KEYS = Object.keys(WATCH_ATTRS);

/** Convert one mapped CSV row (strings) into a partial productInput-shaped object (only provided fields). */
export function normaliseRow(raw, warnings) {
  const r = {};
  for (const k of IMPORT_KEYS) r[k] = str(raw?.[k]);
  const out = {};
  const setIf = (k, v) => {
    if (v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length)) out[k] = v;
  };

  setIf("name", r.name.slice(0, 200));
  setIf("brandName", r.brand.slice(0, 80));
  setIf("sku", r.sku.toUpperCase().slice(0, 60));
  setIf("modelNumber", r.modelNumber);
  if (r.gender) out.gender = normalizeGender(r.gender);
  for (const k of ["price", "mrp", "costPrice", "stock", "lowStockAt", "caseSize", "weightGrams"]) {
    if (!r[k]) continue;
    const n = parseNum(r[k]);
    if (n === null || n < 0) warnings.push(`Ignored ${k} "${r[k]}" (not a number)`);
    else out[k] = n;
  }
  if (r.status) {
    const s = r.status.toUpperCase();
    if (["DRAFT", "ACTIVE", "ARCHIVED"].includes(s)) out.status = s;
    else if (/^(published|live|yes|true|1)$/i.test(r.status)) out.status = "ACTIVE";
    else warnings.push(`Unknown status "${r.status}", using default`);
  }
  setIf("shortDescription", r.shortDescription);
  if (r.description) out.description = sanitizeHtml(/<[a-z]/i.test(r.description) ? r.description : r.description.split(/\n{2,}/).map((p) => `<p>${p}</p>`).join(""), ["br", "em", "h3"]);
  setIf("highlights", parseList(r.highlights));
  setIf("features", parseList(r.features));
  setIf("tags", parseList(r.tags).map((t) => t.toLowerCase()));
  setIf("seoTitle", r.seoTitle);
  setIf("seoDesc", r.seoDesc);
  setIf("strapColor", r.strapColor);
  setIf("warranty", r.warranty);
  for (const k of SPEC_KEYS) {
    if (!r[k]) continue;
    const v = normalizeAttr(k, r[k]);
    if (v) out[k] = v;
    else warnings.push(`Unrecognised ${k} "${r[k]}" skipped`);
  }
  for (const k of ["isFeatured", "isNewArrival", "isBestSeller", "codAvailable"]) {
    const b = parseBool(r[k]);
    if (b !== undefined) out[k] = b;
    else if (r[k]) warnings.push(`Ignored ${k} "${r[k]}" (use yes/no)`);
  }
  out._category = r.category || null;
  out._images = parseList(r.images);
  return out;
}

/** Existing product → productInput-shaped object (so a partial CSV row can be overlaid without wiping data). */
function existingToInput(p) {
  return {
    ...p,
    brandId: p.brandId,
    categoryId: p.categoryId,
    images: p.images.map((im) => ({ url: im.url, alt: im.alt, width: im.width, height: im.height, blurData: im.blurData })),
    collectionIds: p.collections.map((c) => c.collectionId),
  };
}

async function resolveCategory(name, cache) {
  const key = name.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  let cat = await db.category.findFirst({ where: { name: { equals: name, mode: "insensitive" } }, select: { id: true } });
  if (!cat) {
    let slug = slugify(name) || "category";
    if (await db.category.findUnique({ where: { slug }, select: { id: true } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    cat = await db.category.create({ data: { name: name.slice(0, 80), slug }, select: { id: true } });
  }
  cache.set(key, cat.id);
  return cat.id;
}

async function resolveImages(urls, { download }, warnings) {
  const out = [];
  for (const u of urls.slice(0, 20)) {
    if (u.startsWith("/uploads/")) {
      out.push({ url: u });
      continue;
    }
    const safe = safeRemoteUrl(u);
    if (!safe) {
      warnings.push(`Skipped invalid image URL "${u.slice(0, 80)}"`);
      continue;
    }
    if (!download) {
      out.push({ url: safe });
      continue;
    }
    try {
      const saved = await importRemoteImage(safe, { folder: "products" });
      out.push(saved);
    } catch (e) {
      warnings.push(`Image download failed (${u.slice(0, 60)}): ${e.message}`);
    }
  }
  return out;
}

/**
 * Import one mapped row.
 * options: { enrich, downloadImages, updateExisting, defaultStatus }
 * → { ok, id, action: "created"|"updated", error, warnings }
 */
export async function importRow(raw, options, ctx) {
  const warnings = [];
  try {
    const row = normaliseRow(raw, warnings);
    const { _category, _images, ...provided } = row;

    let existing = null;
    if (provided.sku) {
      existing = await db.product.findFirst({
        where: { sku: { equals: provided.sku, mode: "insensitive" } },
        include: { brand: { select: { name: true } }, images: { orderBy: { position: "asc" } }, collections: { select: { collectionId: true } } },
      });
      if (existing && !options.updateExisting) return { ok: false, error: `SKU exists (${existing.sku})`, warnings, skipped: true };
    }

    if (!existing) {
      if (!provided.name) return { ok: false, error: "Name is required", warnings };
      if (!provided.brandName) return { ok: false, error: "Brand is required", warnings };
      if (!provided.price) return { ok: false, error: "Price is required", warnings };
    }

    let data = existing ? { ...existingToInput(existing), ...provided } : { status: options.defaultStatus || "DRAFT", ...provided };

    if (provided.brandName) {
      const b = await ensureBrand(provided.brandName);
      data.brandId = b.id;
      data.brandName = b.name;
    }
    if (_category) data.categoryId = await resolveCategory(_category, ctx.categories);
    if (_images.length) {
      const imgs = await resolveImages(_images, { download: options.downloadImages }, warnings);
      if (imgs.length) data.images = imgs;
    }
    if (!data.images) data.images = [];

    if (options.enrich) {
      try {
        const extra = await aiEnrichRow(data);
        for (const [k, v] of Object.entries(extra)) {
          const cur = data[k];
          if (v && (!cur || (Array.isArray(cur) && !cur.length))) data[k] = v;
        }
      } catch (e) {
        warnings.push(`AI enrichment failed: ${String(e.message || e).slice(0, 120)}`);
      }
    }

    const parsed = productInput.parse(data);
    const { product } = await saveProduct(parsed, existing?.id);
    return { ok: true, id: product.id, slug: product.slug, action: existing ? "updated" : "created", warnings };
  } catch (e) {
    const error = e instanceof ZodError ? zodMessage(e) : e?.code === "P2002" ? "Duplicate value (SKU or slug already exists)" : String(e?.message || e).slice(0, 240);
    return { ok: false, error, warnings };
  }
}

export const canEnrich = () => aiEnabled();
