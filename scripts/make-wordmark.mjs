// Builds the PremiumShopy logo lockups from the bag+watch icon (left part of the master logo)
// plus a typeset wordmark: "Premium" in ink, "Shopy" in white on a saffron pill.
//   public/logo.png        transparent, dark text (light backgrounds)
//   public/logo-light.png  transparent, white text (dark backgrounds)
// Usage: node scripts/make-wordmark.mjs   (needs the icon at public/brand/logo-icon-crop.png)
import sharp from "sharp";

const ICON = "public/brand/logo-icon-crop.png"; // 204×240, transparent
const H = 240;
const FONT = "Segoe UI Black, Arial Black, Arial, sans-serif";
const SIZE = 104;
const ORANGE = "#F6650B";

async function textWidth(text) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${H}"><text x="0" y="160" font-family="${FONT}" font-weight="900" font-size="${SIZE}" letter-spacing="-3">${text}</text></svg>`;
  const { info } = await sharp(Buffer.from(svg)).trim().toBuffer({ resolveWithObject: true });
  return info.width;
}

const wPrem = await textWidth("Premium");
const wShopy = await textWidth("Shopy");
const iconW = 204, gap = 22, pillPad = 26, pillGap = 8;
const textX = iconW + gap;
const pillX = textX + wPrem + pillGap;
const pillW = wShopy + pillPad * 2;
const W = pillX + pillW + 4;

async function build(ink, out) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <text x="${textX}" y="150" font-family="${FONT}" font-weight="900" font-size="${SIZE}" letter-spacing="-3" fill="${ink}">Premium</text>
    <rect x="${pillX}" y="50" width="${pillW}" height="140" rx="70" fill="${ORANGE}"/>
    <text x="${pillX + pillPad}" y="150" font-family="${FONT}" font-weight="900" font-size="${SIZE}" letter-spacing="-3" fill="#ffffff">Shopy</text>
  </svg>`;
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: ICON, left: 0, top: 0 }, { input: Buffer.from(svg), left: 0, top: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(out, W, "x", H);
}

await build("#12151E", "public/logo.png");
await build("#FFFFFF", "public/logo-light.png");
