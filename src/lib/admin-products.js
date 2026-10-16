import "server-only";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import sharp from "sharp";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { slugify } from "./utils";
import { HttpError } from "./api";

/* ───────────── Uploaded file access ───────────── */

const UPLOAD_ROOT = () => path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");

/** Map "/uploads/x/y.webp" to its absolute disk path (with traversal guard). */
export function uploadPath(url) {
  if (typeof url !== "string" || !url.startsWith("/uploads/")) return null;
  const rel = decodeURIComponent(url.slice("/uploads/".length).split("?")[0]);
  const root = UPLOAD_ROOT();
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(root + path.sep)) return null;
  return abs;
}

/** Read an image either from our upload volume or (https only) a remote URL. */
export async function readImageBuffer(url) {
  const local = uploadPath(url);
  if (local) {
    try {
      return await readFile(local);
    } catch {
      throw new HttpError(404, "Uploaded image not found on disk");
    }
  }
  if (/^https:\/\//i.test(url)) {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new HttpError(400, `Could not fetch image (${res.status})`);
    const len = Number(res.headers.get("content-length") || 0);
    if (len > 15 * 1024 * 1024) throw new HttpError(413, "Image too large");
    return Buffer.from(await res.arrayBuffer());
  }
  throw new HttpError(400, "Unsupported image URL");
}

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif"]);
/** Validates a buffer is a real image by magic bytes via sharp. */
export async function assertImage(buffer, maxBytes = 10 * 1024 * 1024) {
  if (!buffer?.length) throw new HttpError(400, "Empty file");
  if (buffer.length > maxBytes) throw new HttpError(413, `File exceeds ${Math.round(maxBytes / 1024 / 1024)}MB`);
  let meta;
  try {
    meta = await sharp(buffer, { failOn: "error" }).metadata();
  } catch {
    throw new HttpError(415, "Not a valid image");
  }
  if (!ALLOWED_FORMATS.has(meta.format)) throw new HttpError(415, `Unsupported image type: ${meta.format}`);
  if ((meta.width || 0) < 64 || (meta.height || 0) < 64) throw new HttpError(422, "Image is too small (min 64px)");
  return meta;
}

/* ───────────── Slugs & SKUs ───────────── */

export async function uniqueSlug(base, excludeId) {
  const root = slugify(base) || "watch";
  let slug = root;
  for (let i = 2; i < 500; i++) {
    const hit = await db.product.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) }, select: { id: true } });
    if (!hit) return slug;
    slug = `${root.slice(0, 84)}-${i}`;
  }
  return `${root.slice(0, 80)}-${Date.now().toString(36)}`;
}

/** PS-BRA-#### (next free number for that brand prefix). */
export async function generateSku(brandName = "GEN") {
  const pre = (String(brandName).replace(/[^a-z]/gi, "").slice(0, 3) || "GEN").toUpperCase().padEnd(3, "X");
  const prefix = `PS-${pre}-`;
  const rows = await db.product.findMany({ where: { sku: { startsWith: prefix } }, select: { sku: true } });
  let max = 1000;
  for (const r of rows) {
    const n = parseInt(r.sku.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  let n = max + 1;
  for (;;) {
    const sku = `${prefix}${String(n).padStart(4, "0")}`;
    if (!(await db.product.findUnique({ where: { sku }, select: { id: true } }))) return sku;
    n++;
  }
}

/* ───────────── Brand resolution ───────────── */

export async function findBrandByName(name) {
  if (!name) return null;
  return db.brand.findFirst({ where: { name: { equals: String(name).trim(), mode: "insensitive" } } });
}

export async function ensureBrand(name) {
  const clean = String(name || "").trim();
  if (!clean) throw new HttpError(422, "Brand is required");
  const found = await findBrandByName(clean);
  if (found) return found;
  let slug = slugify(clean) || "brand";
  if (await db.brand.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  return db.brand.create({ data: { name: clean, slug } });
}

/* ───────────── Validation ───────────── */

const optStr = (max = 500) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null));
const optInt = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v) => (v === "" || v === null || v === undefined ? null : Math.round(Number(v))))
  .refine((v) => v === null || (Number.isFinite(v) && v >= 0), "Must be a positive number");
const strArr = (max = 40, len = 120) =>
  z
    .array(z.string())
    .optional()
    .default([])
    .transform((a) => [...new Set(a.map((s) => s.trim()).filter(Boolean).map((s) => s.slice(0, len)))].slice(0, max));

export const imageInput = z.object({
  url: z.string().min(1).max(1000),
  alt: optStr(200),
  width: optInt,
  height: optInt,
  blurData: optStr(4000),
});

export const productInput = z
  .object({
    name: z.string().trim().min(2, "Name is required").max(200),
    slug: optStr(100),
    sku: optStr(60),
    modelNumber: optStr(80),
    brandId: optStr(40),
    brandName: optStr(80), // create-on-the-fly when brandId is absent
    categoryId: optStr(40),
    gender: z.enum(["MEN", "WOMEN", "UNISEX", "KIDS"]).default("UNISEX"),
    shortDescription: optStr(300),
    description: optStr(20000),
    highlights: strArr(10, 200),
    price: z.coerce.number().int().min(1, "Price is required"),
    mrp: z.coerce.number().int().min(0).optional(),
    costPrice: optInt,
    stock: z.coerce.number().int().min(0).default(0),
    lowStockAt: z.coerce.number().int().min(0).default(3),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
    isFeatured: z.boolean().default(false),
    isNewArrival: z.boolean().default(false),
    isBestSeller: z.boolean().default(false),
    codAvailable: z.boolean().default(true),
    movement: optStr(60),
    caseMaterial: optStr(60),
    caseSize: optInt,
    caseShape: optStr(60),
    dialColor: optStr(60),
    strapMaterial: optStr(60),
    strapColor: optStr(60),
    waterResistance: optStr(30),
    glass: optStr(60),
    display: optStr(60),
    features: strArr(30, 60),
    warranty: optStr(120),
    weightGrams: optInt,
    specs: z
      .union([z.record(z.string(), z.any()), z.array(z.object({ key: z.string(), value: z.any() })), z.null()])
      .optional()
      .transform((v) => {
        if (!v) return null;
        const entries = Array.isArray(v) ? v.map((r) => [r.key, r.value]) : Object.entries(v);
        const clean = entries
          .map(([k, val]) => [String(k).trim().slice(0, 60), String(val ?? "").trim().slice(0, 300)])
          .filter(([k, val]) => k && val);
        return clean.length ? Object.fromEntries(clean) : null;
      }),
    tags: strArr(30, 40).transform((a) => [...new Set(a.map((t) => t.toLowerCase()))]),
    seoTitle: optStr(70),
    seoDesc: optStr(170),
    aiGenerated: z.boolean().default(false),
    images: z.array(imageInput).max(20).optional().default([]),
    collectionIds: z.array(z.string()).max(50).optional().default([]),
  })
  .transform((d) => ({ ...d, mrp: d.mrp && d.mrp >= d.price ? d.mrp : d.price }));

/** Accepts partial updates (for quick edit / bulk) */
export const productPatch = z.object({
  price: z.coerce.number().int().min(1).optional(),
  mrp: z.coerce.number().int().min(0).optional(),
  stock: z.coerce.number().int().min(0).optional(),
  lowStockAt: z.coerce.number().int().min(0).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  isFeatured: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  codAvailable: z.boolean().optional(),
  seoTitle: z.string().max(70).optional(),
  seoDesc: z.string().max(170).optional(),
});

/* ───────────── Save ───────────── */

/**
 * Create or update a product from validated `productInput` data.
 * Handles: brand create-by-name, unique slug, auto SKU, images (full replace), collections (full replace).
 */
export async function saveProduct(data, id) {
  let brandId = data.brandId;
  if (brandId) {
    const b = await db.brand.findUnique({ where: { id: brandId }, select: { id: true } });
    if (!b) brandId = null;
  }
  let brandName = data.brandName;
  if (!brandId) {
    const b = await ensureBrand(brandName);
    brandId = b.id;
    brandName = b.name;
  } else if (!brandName) {
    brandName = (await db.brand.findUnique({ where: { id: brandId }, select: { name: true } }))?.name;
  }

  const existing = id ? await db.product.findUnique({ where: { id }, select: { id: true, slug: true, sku: true } }) : null;
  if (id && !existing) throw new HttpError(404, "Product not found");

  const slug = await uniqueSlug(data.slug || `${brandName || ""} ${data.name}`, id);
  let sku = data.sku ? data.sku.toUpperCase() : existing?.sku || (await generateSku(brandName));
  if (data.sku) {
    const clash = await db.product.findFirst({ where: { sku, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
    if (clash) throw new HttpError(409, `SKU ${sku} is already used by another product`);
  }
  if (data.categoryId && !(await db.category.findUnique({ where: { id: data.categoryId }, select: { id: true } }))) data.categoryId = null;

  const { images, collectionIds, brandName: _bn, brandId: _bid, slug: _s, sku: _sku, specs, ...rest } = data;
  const fields = { ...rest, slug, sku, brandId, specs: specs ?? Prisma.DbNull };

  const imgRows = images.map((im, i) => ({
    url: im.url,
    alt: im.alt || `${brandName || ""} ${data.name}`.trim(),
    width: im.width ?? null,
    height: im.height ?? null,
    blurData: im.blurData ?? null,
    position: i,
  }));
  const validCollections = collectionIds.length
    ? (await db.collection.findMany({ where: { id: { in: collectionIds } }, select: { id: true } })).map((c) => c.id)
    : [];

  const product = await db.$transaction(async (tx) => {
    const p = id ? await tx.product.update({ where: { id }, data: fields }) : await tx.product.create({ data: fields });
    await tx.productImage.deleteMany({ where: { productId: p.id } });
    if (imgRows.length) await tx.productImage.createMany({ data: imgRows.map((r) => ({ ...r, productId: p.id })) });
    await tx.collectionProduct.deleteMany({ where: { productId: p.id, collectionId: { notIn: validCollections } } });
    for (const cid of validCollections) {
      await tx.collectionProduct.upsert({
        where: { collectionId_productId: { collectionId: cid, productId: p.id } },
        update: {},
        create: { collectionId: cid, productId: p.id, position: 999 },
      });
    }
    return p;
  });
  return { product, previousSlug: existing?.slug };
}

/** Full product for the editor. */
export async function getProductForEdit(id) {
  return db.product.findUnique({
    where: { id },
    include: {
      brand: { select: { id: true, name: true } },
      images: { orderBy: { position: "asc" } },
      collections: { select: { collectionId: true } },
    },
  });
}
