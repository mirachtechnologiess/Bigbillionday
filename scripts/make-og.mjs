// Renders the default social share image (public/og-default.jpg, 1200×630):
// white card with the BigBillionDay logo, tagline and three real product photos from the catalogue.
// Run after logo assets exist: node scripts/make-og.mjs
import sharp from "sharp";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");

const products = await db.product.findMany({
  where: { status: "ACTIVE", images: { some: {} }, category: { slug: { not: "accessories" } } },
  orderBy: [{ isFeatured: "desc" }, { price: "desc" }],
  include: { images: { orderBy: { position: "asc" }, take: 1 } },
  take: 3,
});
await db.$disconnect();

const tile = async (url, rot) => {
  const photo = await sharp(path.join(UPLOAD_DIR, url.replace(/^\/uploads\//, ""))).resize(230, 230, { fit: "cover" }).toBuffer();
  const framed = await sharp({ create: { width: 250, height: 250, channels: 4, background: "#ffffff" } })
    .composite([{ input: photo, left: 10, top: 10 }]).png().toBuffer();
  return sharp(framed).rotate(rot, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
};

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#ffffff"/>
  <rect x="640" y="0" width="560" height="630" fill="#0b7d78"/>
  <g fill="#ffffff" opacity=".12">${Array.from({ length: 22 * 12 }, (_, i) => `<circle cx="${652 + (i % 22) * 25}" cy="${14 + Math.floor(i / 22) * 52}" r="2"/>`).join("")}</g>
  <circle cx="1130" cy="40" r="170" fill="none" stroke="#ffffff" stroke-opacity=".1" stroke-width="34"/>
  <text x="72" y="345" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="34" fill="#15171c">Watches for men &amp; women</text>
  <text x="72" y="392" font-family="Arial, Helvetica, sans-serif" font-size="26" fill="#3f4550">at unbeatable prices</text>
  <rect x="72" y="438" width="356" height="52" rx="26" fill="#f2600c"/>
  <text x="250" y="472" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="22" fill="#ffffff">Cash on Delivery · India</text>
  <text x="72" y="556" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="20" letter-spacing="2" fill="#0b7d78">BIGBILLIONDAY.STORE</text>
</svg>`;

const logo = await sharp("public/logo.png").resize({ width: 500 }).toBuffer();
const rots = [-8, 5, -3];
const pos = [[670, 70], [900, 150], [740, 330]];
const tiles = await Promise.all(products.map((p, i) => tile(p.images[0].url, rots[i])));

await sharp(Buffer.from(svg))
  .composite([{ input: logo, left: 66, top: 120 }, ...tiles.map((t, i) => ({ input: t, left: pos[i][0], top: pos[i][1] }))])
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile("public/og-default.jpg");
console.log(`✓ public/og-default.jpg (${tiles.length} product photos)`);
