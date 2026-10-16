// Imports the catalog from the old premiumshopy.com API (api.premiumshopy.com/api/v1) into this store.
// Downloads every product photo (front/left/right/rotate views) and converts it to WebP in UPLOAD_DIR.
//
//   node scripts/import-legacy.mjs            # import / update (idempotent, matched by legacy id in SKU)
//   node scripts/import-legacy.mjs --replace  # also remove the procedurally-rendered demo catalog first
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const db = new PrismaClient();
const BASE = "https://api.premiumshopy.com/api/v1/";
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");
const REPLACE = process.argv.includes("--replace");

// ── Old API request signing (mirrors the old React client: HS256 JWT keyed by URL, AES-encrypted with a passphrase)
const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
function evpKdf(pass, salt) {
  let d = Buffer.alloc(0), prev = Buffer.alloc(0);
  while (d.length < 48) {
    prev = crypto.createHash("md5").update(Buffer.concat([prev, Buffer.from(pass), salt])).digest();
    d = Buffer.concat([d, prev]);
  }
  return { key: d.subarray(0, 32), iv: d.subarray(32, 48) };
}
function token(url) {
  const h = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64url(JSON.stringify({ exp: null, isHuman: true }));
  const jwt = `${h}.${p}.${b64url(crypto.createHmac("sha256", url).update(`${h}.${p}`).digest())}`;
  const salt = crypto.randomBytes(8);
  const { key, iv } = evpKdf("afasdfasdfadfd", salt);
  const c = crypto.createCipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([Buffer.from("Salted__"), salt, c.update(jwt), c.final()]).toString("base64");
}
async function api(p) {
  const url = BASE + p;
  const r = await fetch(url, { headers: { "content-type": "application/json", Authorization: "null", JdstEWUawW: token(url) } });
  if (!r.ok) throw new Error(`${p} → HTTP ${r.status}`);
  return r.json();
}

// ── Normalisation
const slug = (s) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
const BRAND_MAP = [
  [/^(casio|analog quartz|mtp|edifice|casio edifice)/i, "Casio"],
  [/^(g-?shock|gshock)/i, "G-Shock"],
  [/^rolex/i, "Rolex"], [/^rado/i, "Rado"], [/^richard mille/i, "Richard Mille"], [/^diese/i, "Diesel"],
  [/^seiko/i, "Seiko"], [/^ray-?ban/i, "Ray-Ban"], [/^arman/i, "Armani Exchange"], [/^(tommy|hilfiger|tomy)/i, "Tommy Hilfiger"],
  [/^(apple|app)$/i, "Apple"], [/^tag heuer/i, "TAG Heuer"], [/^patek/i, "Patek Philippe"], [/^oneplus/i, "OnePlus"],
  [/^chrome heart/i, "Chrome Hearts"], [/^fire-?boltt/i, "Fire-Boltt"], [/^citizen/i, "Citizen"], [/^fossil/i, "Fossil"],
  [/^michael kors/i, "Michael Kors"], [/^tissot/i, "Tissot"], [/^omega/i, "Omega"], [/^samsung/i, "Samsung"], [/^realme/i, "Realme"],
];
function brandOf(raw = "", title = "") {
  const b = raw.trim();
  for (const [re, name] of BRAND_MAP) if (re.test(b)) return name;
  for (const [re, name] of BRAND_MAP) if (re.test(title.trim())) return name;
  if (!b || b.length <= 3 || /^(gen2|wondercrate|cr7|shiva|rosemary)$/i.test(b)) return "BigBillionDay Select";
  return b.replace(/\s+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
const NON_WATCH = /(sunglass|shade|ray-?ban|chrome heart|buds|earbud|airpod|spray|idol|hair|perfume)/i;
const SMART = /(smart|galaxy watch|apple watch|ultra|fire-?boltt|s12|amazfit|noise)/i;
function classify(p, brand) {
  const t = `${p.title} ${brand}`;
  if (NON_WATCH.test(t)) return { category: "Accessories", display: null };
  if (SMART.test(t)) return { category: "Smart Watches", display: "Smart" };
  if (p.category === "/digital") return { category: "Digital Watches", display: "Digital" };
  if (p.category === "/analog-digital") return { category: "Analog-Digital Watches", display: "Analog-Digital" };
  return { category: "Analog Watches", display: "Analog" };
}
const gender = (g = "") => (/^f|wom/i.test(g) ? "WOMEN" : /^m/i.test(g) ? "MEN" : "UNISEX");
const COLORS = ["Black", "Blue", "White", "Silver", "Green", "Grey", "Gold", "Rose Gold", "Brown", "Red", "Champagne"];
const dialFrom = (c = "") => COLORS.find((x) => new RegExp(`\\b${x}\\b`, "i").test(c)) || null;

async function saveRemote(url, folder) {
  const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`image ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const dir = path.join(UPLOAD_DIR, folder);
  await mkdir(dir, { recursive: true });
  const { data, info } = await sharp(buf).rotate().resize(1200, 1200, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const file = `${crypto.createHash("md5").update(url).digest("hex").slice(0, 16)}.webp`;
  await writeFile(path.join(dir, file), data);
  const tiny = await sharp(buf).rotate().resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
  return { url: `/uploads/${folder}/${file}`, width: info.width, height: info.height, blurData: `data:image/webp;base64,${tiny.toString("base64")}` };
}

async function main() {
  const all = [];
  for (let page = 1; page < 50; page++) {
    const j = await api(`user/getProducts?category=all&page=${page}`);
    all.push(...(j.products || []));
    if (!j.hasMore) break;
  }
  const products = [...new Map(all.map((p) => [p._id, p])).values()];
  console.log(`fetched ${products.length} products from premiumshopy.com`);

  if (REPLACE) {
    const demo = await db.product.findMany({ where: { sku: { startsWith: "PS-" }, NOT: { sku: { startsWith: "PS-L-" } } }, select: { id: true } });
    await db.product.deleteMany({ where: { id: { in: demo.map((d) => d.id) } } });
    await db.collection.deleteMany({});
    await db.brand.deleteMany({ where: { products: { none: {} } } });
    await db.category.deleteMany({ where: { products: { none: {} } } });
    console.log(`removed ${demo.length} demo products`);
  }

  const brandIds = new Map();
  const catIds = new Map();
  let i = 0, ok = 0;
  for (const p of products) {
    i++;
    try {
      const brand = brandOf(p.brand, p.title);
      const { category, display } = classify(p, brand);
      if (!brandIds.has(brand)) {
        const b = await db.brand.upsert({ where: { slug: slug(brand) }, update: {}, create: { name: brand, slug: slug(brand) } });
        brandIds.set(brand, b.id);
      }
      if (!catIds.has(category)) {
        const c = await db.category.upsert({ where: { slug: slug(category) }, update: {}, create: { name: category, slug: slug(category), sortOrder: catIds.size } });
        catIds.set(category, c.id);
      }
      const v = p.images?.[0] || {};
      const urls = [v.image, v.leftviewimage, v.rightviewimage, v.rotateviewimage].filter(Boolean);
      const unique = [...new Set(urls)];
      const sku = `PS-L-${p._id.slice(-8).toUpperCase()}`;
      const existing = await db.product.findUnique({ where: { sku }, include: { images: true } });
      let images = existing?.images?.length ? null : [];
      if (images) {
        for (const [pos, u] of unique.entries()) {
          try {
            images.push({ ...(await saveRemote(u, "legacy")), position: pos, alt: `${p.title.trim()}${pos ? ` – view ${pos + 1}` : ""}` });
          } catch (e) {
            console.warn(`  image skipped (${e.message})`);
          }
        }
      }
      const name = p.title.replace(/\s+/g, " ").trim();
      const price = Math.round(Number(p.discountPrice) || 0);
      const mrp = Math.max(price, Math.round(Number(p.actualPrice) || price));
      const isWatch = category !== "Accessories";
      const data = {
        name,
        brandId: brandIds.get(brand),
        categoryId: catIds.get(category),
        gender: gender(v.gender),
        price,
        mrp,
        display,
        dialColor: isWatch ? dialFrom(v.color) : null,
        strapColor: v.color || null,
        caseMaterial: p.caseMaterial && p.caseMaterial.length < 40 ? p.caseMaterial : null,
        waterResistance: /yes/i.test(p.waterResistant || "") ? "30m" : null,
        highlights: [p.offer && `Offer: ${p.offer.trim()}`, p.thickness && `Thickness: ${p.thickness}`, v.color && `Colour: ${v.color}`, "Cash on Delivery available"].filter(Boolean),
        shortDescription: `${name} — ${v.color ? `${v.color.toLowerCase()} finish, ` : ""}Cash on Delivery across India.`,
        specs: { legacyId: p._id, offer: p.offer || null, thickness: p.thickness || null, waterResistant: p.waterResistant || null },
        tags: [brand.toLowerCase(), category.toLowerCase(), (v.color || "").toLowerCase()].filter(Boolean),
        isNewArrival: Date.now() - new Date(p.date || 0).getTime() < 1000 * 60 * 60 * 24 * 45,
        isFeatured: p.timer === true,
        status: "ACTIVE",
      };
      if (existing) {
        await db.product.update({ where: { id: existing.id }, data });
      } else {
        let s = slug(`${brand} ${name}`) || slug(sku);
        if (await db.product.findUnique({ where: { slug: s } })) s = `${s}-${p._id.slice(-5)}`;
        await db.product.create({
          data: { ...data, sku, slug: s, stock: 10, createdAt: p.date ? new Date(p.date) : undefined, images: { create: images } },
        });
      }
      ok++;
      process.stdout.write(`\r  ${i}/${products.length} ${name.slice(0, 50).padEnd(50)}`);
    } catch (e) {
      console.warn(`\n  ✗ ${p.title}: ${e.message}`);
    }
  }
  console.log(`\n✓ imported ${ok}/${products.length}`);

  // Data-driven home collections
  const defs = [
    ["Under ₹999", "Steals under a thousand.", { price: { lte: 999 } }],
    ["Luxury Looks", "Iconic designs, everyday prices.", { brand: { name: { in: ["Rolex", "Richard Mille", "Patek Philippe", "Omega", "TAG Heuer", "Rado"] } } }],
    ["Smart Watches", "Calls, fitness and notifications.", { display: "Smart" }],
  ];
  for (const [n, [name, description, where]] of defs.entries()) {
    const c = await db.collection.upsert({ where: { slug: slug(name) }, update: {}, create: { name, slug: slug(name), description, showOnHome: true, sortOrder: n } });
    const ps = await db.product.findMany({ where: { status: "ACTIVE", ...where }, select: { id: true }, take: 24 });
    for (const [pos, p] of ps.entries())
      await db.collectionProduct.upsert({ where: { collectionId_productId: { collectionId: c.id, productId: p.id } }, update: {}, create: { collectionId: c.id, productId: p.id, position: pos } });
  }
  console.log("✓ collections refreshed");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
