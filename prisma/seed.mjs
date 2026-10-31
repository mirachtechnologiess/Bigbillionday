// Seeds settings, the first admin, brands, categories, collections, a coupon and demo watches.
// Demo product images are rendered procedurally (SVG -> WebP) so the store looks complete on first boot.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const db = new PrismaClient();
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const BRANDS = [
  ["Seiko", "Japan", true], ["Citizen", "Japan", true], ["Casio", "Japan", true], ["Tissot", "Switzerland", true],
  ["Titan", "India", true], ["Fossil", "USA", true], ["Timex", "USA", false], ["Daniel Wellington", "Sweden", false],
  ["Michael Kors", "USA", false], ["Armani Exchange", "Italy", false], ["Tommy Hilfiger", "USA", false], ["Orient", "Japan", false],
];

const CATEGORIES = [
  ["Automatic", "Self-winding mechanical watches powered by the motion of your wrist."],
  ["Chronograph", "Stopwatch complications for precision timing."],
  ["Dress", "Slim, refined pieces for formal occasions."],
  ["Diver", "Rugged, water-resistant tools built for depth."],
  ["Smart", "Connected watches with health and fitness tracking."],
  ["Digital", "Tough digital and ana-digi everyday watches."],
];

// [name, brand, category, gender, price, mrp, movement, caseMaterial, size, dial, strap, wr, glass, display, flags]
const PRODUCTS = [
  ["Presage Cocktail Time Blue Acapulco", "Seiko", "Automatic", "MEN", 38900, 42500, "Automatic", "Stainless Steel", 40, "Blue", "Leather", "50m", "Hardlex", "Analog", "fb"],
  ["Prospex Turtle Diver", "Seiko", "Diver", "MEN", 34500, 37900, "Automatic", "Stainless Steel", 45, "Black", "Silicone", "200m", "Hardlex", "Analog", "f"],
  ["5 Sports Field Green", "Seiko", "Automatic", "MEN", 21900, 24500, "Automatic", "Stainless Steel", 39, "Green", "Nylon", "100m", "Hardlex", "Analog", "n"],
  ["Eco-Drive Promaster Navihawk", "Citizen", "Chronograph", "MEN", 36900, 41500, "Solar", "Stainless Steel", 48, "Black", "Stainless Steel", "200m", "Mineral", "Analog", "b"],
  ["Tsuyosa Sunburst Teal", "Citizen", "Automatic", "UNISEX", 27500, 29900, "Automatic", "Stainless Steel", 40, "Green", "Stainless Steel", "50m", "Sapphire", "Analog", "fn"],
  ["Eco-Drive Classic Rose", "Citizen", "Dress", "WOMEN", 18900, 21900, "Solar", "Rose Gold PVD", 30, "Mother of Pearl", "Stainless Steel", "50m", "Mineral", "Analog", ""],
  ["G-Shock GA-2100 CasiOak", "Casio", "Digital", "MEN", 9995, 10995, "Quartz", "Resin", 45, "Black", "Rubber", "200m", "Mineral", "Analog-Digital", "fb"],
  ["Vintage A168 Gold", "Casio", "Digital", "UNISEX", 5495, 5995, "Quartz", "Gold PVD", 36, "Gold", "Stainless Steel", "30m", "Acrylic", "Digital", "b"],
  ["Edifice Chronograph Racing Red", "Casio", "Chronograph", "MEN", 13995, 15995, "Chronograph Quartz", "Stainless Steel", 44, "Black", "Stainless Steel", "100m", "Mineral", "Analog", "n"],
  ["PRX Powermatic 80 Ice Blue", "Tissot", "Automatic", "MEN", 64500, 68000, "Automatic", "Stainless Steel", 40, "Blue", "Stainless Steel", "100m", "Sapphire", "Analog", "fbn"],
  ["Seastar 1000 Chronograph", "Tissot", "Diver", "MEN", 49900, 54000, "Chronograph Quartz", "Stainless Steel", 45, "Black", "Rubber", "300m+", "Sapphire", "Analog", "f"],
  ["Everytime Lady Silver", "Tissot", "Dress", "WOMEN", 21500, 23500, "Quartz", "Stainless Steel", 34, "Silver", "Mesh", "30m", "Sapphire", "Analog", ""],
  ["Edge Ceramic Ultra Slim", "Titan", "Dress", "MEN", 24995, 27995, "Quartz", "Ceramic", 42, "Black", "Ceramic", "30m", "Sapphire", "Analog", "f"],
  ["Raga Aurora Rose Gold", "Titan", "Dress", "WOMEN", 11495, 12995, "Quartz", "Rose Gold PVD", 28, "Rose Gold", "Stainless Steel", "30m", "Mineral", "Analog", "b"],
  ["Stellar Moonphase Champagne", "Titan", "Dress", "MEN", 15995, 17995, "Quartz", "Gold PVD", 43, "Champagne", "Leather", "50m", "Mineral", "Analog", "n"],
  ["Grant Chronograph Brown", "Fossil", "Chronograph", "MEN", 12995, 14995, "Chronograph Quartz", "Stainless Steel", 44, "White", "Leather", "50m", "Mineral", "Analog", "b"],
  ["Gen 6 Hybrid Smartwatch", "Fossil", "Smart", "UNISEX", 17995, 19995, "Smart", "Stainless Steel", 45, "Black", "Silicone", "30m", "Gorilla Glass", "Smart", "n"],
  ["Marlin Hand-Wound Reissue", "Timex", "Dress", "MEN", 18495, 19995, "Mechanical (Hand-wound)", "Stainless Steel", 34, "Silver", "Leather", "30m", "Acrylic", "Analog", ""],
  ["Q Timex Reissue Pepsi", "Timex", "Diver", "MEN", 15995, 16995, "Quartz", "Stainless Steel", 38, "Blue", "Stainless Steel", "50m", "Acrylic", "Analog", "f"],
  ["Petite Melrose Rose", "Daniel Wellington", "Dress", "WOMEN", 12999, 15499, "Quartz", "Rose Gold PVD", 32, "White", "Mesh", "30m", "Mineral", "Analog", "b"],
  ["Lexington Chronograph Gold", "Michael Kors", "Chronograph", "WOMEN", 22995, 25995, "Chronograph Quartz", "Gold PVD", 38, "Gold", "Stainless Steel", "100m", "Mineral", "Analog", "f"],
  ["Hampton Skeleton Automatic", "Armani Exchange", "Automatic", "MEN", 24995, 27995, "Automatic", "Stainless Steel", 46, "Skeleton", "Stainless Steel", "50m", "Mineral", "Analog", "n"],
  ["Decker Multifunction Navy", "Tommy Hilfiger", "Chronograph", "MEN", 10999, 12999, "Quartz", "Stainless Steel", 44, "Blue", "Leather", "50m", "Mineral", "Analog", ""],
  ["Bambino Open Heart Black", "Orient", "Automatic", "MEN", 16500, 18500, "Automatic", "Stainless Steel", 41, "Black", "Leather", "30m", "Mineral", "Analog", "b"],
];

const DIAL = {
  Blue: ["#123a6b", "#0a1f3d"], Black: ["#1b1b1e", "#050506"], Green: ["#1f4d3a", "#0b2219"], White: ["#f2efe8", "#cfcac0"],
  Silver: ["#d9dbde", "#9a9ea4"], Gold: ["#d8b56a", "#8f6d2e"], "Rose Gold": ["#e2b3a0", "#a3705e"], Champagne: ["#e6d3a8", "#a8915e"],
  "Mother of Pearl": ["#f4ece6", "#c9bdd0"], Skeleton: ["#2a2622", "#0d0b09"], Grey: ["#5b5f66", "#2a2d31"],
};
const CASE = {
  "Gold PVD": ["#f1d79a", "#9a7a3a"], "Rose Gold PVD": ["#f0c3ad", "#a86f58"], Ceramic: ["#2b2b2e", "#0b0b0c"], Resin: ["#222", "#080808"],
  default: ["#f4f5f6", "#7d8187"],
};
const STRAP = { Leather: "#5b3a22", Silicone: "#141416", Rubber: "#141416", Nylon: "#3e4a32", Mesh: "#b9bcc0", Ceramic: "#141416" };

function watchSvg({ dial, caseMat, strap, angle = 0, digital = false }) {
  const [d1, d2] = DIAL[dial] || DIAL.Black;
  const [c1, c2] = CASE[caseMat] || CASE.default;
  const s = STRAP[strap] || c2;
  const light = ["White", "Silver", "Mother of Pearl", "Champagne", "Gold", "Rose Gold"].includes(dial);
  const ink = light ? "#1a1a1a" : "#f3efe6";
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i * 6 * Math.PI) / 180, big = i % 5 === 0;
    const r1 = big ? 150 : 162, r2 = 172;
    return `<line x1="${400 + r1 * Math.sin(a)}" y1="${400 - r1 * Math.cos(a)}" x2="${400 + r2 * Math.sin(a)}" y2="${400 - r2 * Math.cos(a)}" stroke="${ink}" stroke-opacity="${big ? 0.95 : 0.5}" stroke-width="${big ? 6 : 2}" stroke-linecap="round"/>`;
  }).join("");
  const face = digital
    ? `<rect x="300" y="350" width="200" height="90" rx="10" fill="#9fb59a" opacity=".9"/><text x="400" y="415" font-family="monospace" font-size="56" text-anchor="middle" fill="#1b2a1b">10:08</text>`
    : `${ticks}
      <g transform="rotate(-60 400 400)"><rect x="394" y="290" width="12" height="118" rx="6" fill="${ink}"/></g>
      <g transform="rotate(48 400 400)"><rect x="396" y="245" width="8" height="163" rx="4" fill="${ink}"/></g>
      <g transform="rotate(200 400 400)"><rect x="399" y="230" width="2" height="200" fill="#c9a96e"/></g>
      <circle cx="400" cy="400" r="12" fill="#c9a96e"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="#1d1c1a"/><stop offset="1" stop-color="#070707"/></radialGradient>
    <linearGradient id="case" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".5" stop-color="${c2}"/><stop offset="1" stop-color="${c1}"/></linearGradient>
    <radialGradient id="dial" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="${d1}"/><stop offset="1" stop-color="${d2}"/></radialGradient>
    <linearGradient id="glare" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="30" stdDeviation="30" flood-color="#000" flood-opacity=".7"/></filter>
  </defs>
  <rect width="800" height="1000" fill="url(#bg)"/>
  <ellipse cx="400" cy="900" rx="260" ry="26" fill="#000" opacity=".6"/>
  <g transform="rotate(${angle} 400 500) translate(0 100)" filter="url(#sh)">
    <rect x="300" y="-120" width="200" height="300" rx="40" fill="${s}"/>
    <rect x="300" y="620" width="200" height="300" rx="40" fill="${s}"/>
    <rect x="300" y="-120" width="200" height="1040" rx="40" fill="#000" opacity=".18"/>
    <rect x="590" y="380" width="34" height="40" rx="8" fill="url(#case)"/>
    <circle cx="400" cy="400" r="232" fill="url(#case)"/>
    <circle cx="400" cy="400" r="206" fill="${c2}" opacity=".6"/>
    <circle cx="400" cy="400" r="196" fill="url(#dial)"/>
    ${face}
    <text x="400" y="320" font-family="Georgia, serif" font-size="22" letter-spacing="6" text-anchor="middle" fill="${ink}" opacity=".85">PREMIUM</text>
    <circle cx="400" cy="400" r="196" fill="url(#glare)"/>
  </g>
</svg>`;
}

async function renderImages(p, i) {
  const dir = path.join(UPLOAD_DIR, "seed");
  await mkdir(dir, { recursive: true });
  const out = [];
  for (const [k, angle] of [[0, 0], [1, -18]]) {
    const svg = watchSvg({ dial: p.dial, caseMat: p.caseMaterial, strap: p.strapMaterial, angle, digital: p.display === "Digital" });
    const buf = await sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer();
    const file = `${slug(p.name)}-${k}.webp`;
    await writeFile(path.join(dir, file), buf);
    const tiny = await sharp(buf).resize(16, 20).webp({ quality: 40 }).toBuffer();
    out.push({ url: `/uploads/seed/${file}`, alt: `${p.brand} ${p.name} watch${k ? " – angled view" : ""}`, width: 800, height: 1000, blurData: `data:image/webp;base64,${tiny.toString("base64")}`, position: k });
  }
  return out;
}

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@premiumshopy.com";
  const password = process.env.ADMIN_PASSWORD || "ChangeMe@123";
  await db.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Store Admin", role: "ADMIN", passwordHash: await bcrypt.hash(password, 11) },
  });
  console.log(`✓ admin: ${email}`);

  const demo = process.env.SEED_DEMO !== "false";
  if (demo) await seedDemoCatalog();
  await db.coupon.upsert({ where: { code: "WELCOME10" }, update: {}, create: { code: "WELCOME10", description: "10% off your first order (max ₹2,000)", type: "PERCENT", value: 10, minOrder: 999, maxDiscount: 2000 } });
  console.log(demo ? "✓ demo catalog + WELCOME10 coupon" : "✓ WELCOME10 coupon (demo catalog skipped — import the real catalog with scripts/import-legacy.mjs)");
}

async function seedDemoCatalog() {
  const brandIds = {};
  for (const [i, [name, country, isFeatured]] of BRANDS.entries()) {
    const b = await db.brand.upsert({
      where: { slug: slug(name) },
      update: {},
      create: { name, slug: slug(name), country, isFeatured, sortOrder: i, description: `${name} style watches, delivered across India with Cash on Delivery.` },
    });
    brandIds[name] = b.id;
  }
  const catIds = {};
  for (const [i, [name, description]] of CATEGORIES.entries()) {
    const c = await db.category.upsert({ where: { slug: slug(name) }, update: {}, create: { name, slug: slug(name), description, sortOrder: i } });
    catIds[name] = c.id;
  }
  console.log(`✓ ${BRANDS.length} brands, ${CATEGORIES.length} categories`);

  const existing = await db.product.count();
  if (existing === 0) {
    for (const [i, r] of PRODUCTS.entries()) {
      const [name, brand, category, gender, price, mrp, movement, caseMaterial, caseSize, dial, strapMaterial, waterResistance, glass, display, flags] = r;
      const p = { name, brand, dial, caseMaterial, strapMaterial, display };
      const images = await renderImages(p, i);
      await db.product.create({
        data: {
          name, slug: slug(`${brand} ${name}`), sku: `PS-${slug(brand).slice(0, 3).toUpperCase()}-${String(1001 + i)}`,
          brandId: brandIds[brand], categoryId: catIds[category], gender, price, mrp, costPrice: Math.round(price * 0.72),
          stock: 3 + ((i * 7) % 18), status: "ACTIVE",
          isFeatured: flags.includes("f"), isBestSeller: flags.includes("b"), isNewArrival: flags.includes("n"),
          movement, caseMaterial, caseSize, caseShape: "Round", dialColor: dial, strapMaterial, strapColor: strapMaterial === "Leather" ? "Brown" : "Black",
          waterResistance, glass, display, warranty: "1 Year Brand Warranty",
          features: display === "Smart" ? ["Heart rate", "SpO2", "Notifications", "Sleep tracking"] : movement === "Automatic" ? ["Exhibition caseback", "Hacking seconds", "Luminous hands"] : ["Luminous hands", "Date window"],
          highlights: [`${caseSize}mm ${caseMaterial.toLowerCase()} case`, `${movement} movement`, `${glass} crystal`, `Water resistant to ${waterResistance}`],
          shortDescription: `${brand} ${name} — a ${caseSize}mm ${movement.toLowerCase()} watch with a ${dial.toLowerCase()} dial and ${strapMaterial.toLowerCase()} strap.`,
          description: `<p>The <strong>${brand} ${name}</strong> pairs a ${caseSize}mm ${caseMaterial.toLowerCase()} case with a ${dial.toLowerCase()} dial that shifts with the light. Powered by a dependable ${movement.toLowerCase()} movement, it is built for daily wear and water resistant to ${waterResistance}.</p><ul><li>${glass} crystal</li><li>${strapMaterial} strap</li><li>Ships in original brand packaging with warranty card</li></ul>`,
          tags: [brand.toLowerCase(), category.toLowerCase(), movement.toLowerCase(), dial.toLowerCase(), gender.toLowerCase()],
          ratingAvg: 4 + ((i * 3) % 10) / 10, ratingCount: 6 + ((i * 11) % 80), soldCount: (i * 13) % 140,
          images: { create: images },
        },
      });
    }
    console.log(`✓ ${PRODUCTS.length} demo products with rendered images`);
  } else console.log(`• products exist (${existing}), skipping demo catalog`);

  for (const [i, [name, desc, filter]] of [
    ["The Automatic Edit", "Mechanical hearts that never need a battery.", { movement: "Automatic" }],
    ["Under ₹15,000", "Serious watches, sensible prices.", { price: { lte: 15000 } }],
    ["For Her", "Refined pieces with presence.", { gender: "WOMEN" }],
  ].entries()) {
    const c = await db.collection.upsert({ where: { slug: slug(name) }, update: {}, create: { name, slug: slug(name), description: desc, showOnHome: true, sortOrder: i } });
    const ps = await db.product.findMany({ where: { status: "ACTIVE", ...filter }, select: { id: true }, take: 12 });
    for (const [pos, p] of ps.entries()) {
      await db.collectionProduct.upsert({ where: { collectionId_productId: { collectionId: c.id, productId: p.id } }, update: {}, create: { collectionId: c.id, productId: p.id, position: pos } });
    }
  }
  console.log("✓ demo collections");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
