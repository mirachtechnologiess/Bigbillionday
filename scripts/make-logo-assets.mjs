// Builds logo assets from the Higgsfield-generated master (white background PNG):
//   public/logo.png        full lockup, transparent, trimmed (light backgrounds)
//   public/logo-light.png  same with white text (dark backgrounds, e.g. footer)
//   public/logo-icon.png   bag+watch icon only, transparent, square (512px)
//   public/apple-icon.png  icon on white, 180px      public/icon-192.png / icon-512.png (PWA)
//   src/app/icon.png       favicon (Next.js file convention)
// Usage: node scripts/make-logo-assets.mjs <master.png>
import sharp from "sharp";

const master = process.argv[2];
if (!master) throw new Error("usage: node scripts/make-logo-assets.mjs <master.png>");

/** Exact "colour to alpha" for a white background: removes white while keeping anti-aliased edges. */
async function whiteToAlpha(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const a = Math.max(255 - r, 255 - g, 255 - b) / 255; // how far from white
    if (a < 0.02) { data[i + 3] = 0; continue; }
    data[i] = Math.round((r - (1 - a) * 255) / a);
    data[i + 1] = Math.round((g - (1 - a) * 255) / a);
    data[i + 2] = Math.round((b - (1 - a) * 255) / a);
    data[i + 3] = Math.round(a * 255);
  }
  return sharp(data, { raw: info }).png();
}

const trimmed = await sharp(master).flatten({ background: "#fff" }).trim({ background: "#ffffff", threshold: 20 }).toBuffer({ resolveWithObject: true });
const { width: W, height: H } = trimmed.info;

/**
 * Smart cut-out: near-white regions become transparent only if they touch the image edge or are
 * enclosed by dark text (letter counters). White enclosed by coloured shapes (dial face, "Day" pill
 * letters) stays opaque. Anti-aliased edge pixels get partial alpha. Optionally recolour dark text.
 */
async function cutout(input, { darkTo } = {}) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = w * h;
  const isWhite = (i) => Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) > 228;
  const isDark = (i) => Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) < 90;
  const label = new Int32Array(n).fill(-1);
  const clear = [];
  for (let start = 0; start < n; start++) {
    if (label[start] !== -1 || !isWhite(start)) continue;
    const id = clear.length;
    const stack = [start];
    label[start] = id;
    let edge = false, darkN = 0, colourN = 0;
    while (stack.length) {
      const p = stack.pop();
      const x = p % w, y = (p - x) / w;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true;
      for (const q of [p - 1, p + 1, p - w, p + w]) {
        if (q < 0 || q >= n || (q === p - 1 && x === 0) || (q === p + 1 && x === w - 1)) continue;
        if (label[q] !== -1) continue;
        if (isWhite(q)) { label[q] = id; stack.push(q); }
        else if (isDark(q)) darkN++;
        else colourN++;
      }
    }
    clear.push(edge || darkN > colourN);
  }
  const transparent = (i) => label[i] !== -1 && clear[label[i]];
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (transparent(i)) { data[o + 3] = 0; continue; }
    // soften anti-aliased pixels that border a transparent region
    const x = i % w;
    const nearClear = (x > 0 && transparent(i - 1)) || (x < w - 1 && transparent(i + 1)) || (i >= w && transparent(i - w)) || (i + w < n && transparent(i + w));
    if (nearClear) {
      const a = Math.max(255 - data[o], 255 - data[o + 1], 255 - data[o + 2]) / 255;
      if (a < 0.98 && a > 0.02) {
        for (let c = 0; c < 3; c++) data[o + c] = Math.max(0, Math.min(255, Math.round((data[o + c] - (1 - a) * 255) / a)));
        data[o + 3] = Math.round(a * 255);
      }
    }
    if (darkTo && Math.max(data[o], data[o + 1], data[o + 2]) < 110 && Math.max(data[o], data[o + 1], data[o + 2]) - Math.min(data[o], data[o + 1], data[o + 2]) < 40) {
      data[o] = darkTo[0]; data[o + 1] = darkTo[1]; data[o + 2] = darkTo[2];
    }
  }
  return sharp(data, { raw: info }).png();
}

// Full lockup: dark text for light backgrounds, white text for dark backgrounds (footer)
await (await cutout(trimmed.data)).resize({ height: 240 }).toFile("public/logo.png");
await (await cutout(trimmed.data, { darkTo: [255, 255, 255] })).resize({ height: 240 }).toFile("public/logo-light.png");

// Icon = leftmost blob: scan columns until a run of empty (white) columns separates icon from wordmark.
const { data: px } = await sharp(trimmed.data).greyscale().raw().toBuffer({ resolveWithObject: true });
const colInk = (x) => { for (let y = 0; y < H; y++) if (px[y * W + x] < 235) return true; return false; };
let iconEnd = 0, gap = 0;
for (let x = 0; x < W; x++) {
  if (colInk(x)) { iconEnd = x; gap = 0; } else if (iconEnd && ++gap > W * 0.015) break;
}
const icon = await sharp(trimmed.data).extract({ left: 0, top: 0, width: iconEnd + 1, height: H }).trim({ background: "#ffffff", threshold: 20 }).toBuffer();
const square = async (size, bg) => {
  const inner = Math.round(size * 0.84);
  const pad = Math.floor((size - inner) / 2);
  const fitted = await sharp(icon).resize(inner, inner, { fit: "contain", background: "#ffffff" }).toBuffer();
  const padded = await sharp(fitted).extend({ top: pad, bottom: size - inner - pad, left: pad, right: size - inner - pad, background: "#ffffff" }).toBuffer();
  return sharp(padded).flatten({ background: bg }).png().toBuffer();
};

await (await cutout(await square(512, "#ffffff"))).toFile("public/logo-icon.png");
await sharp(await square(180, "#ffffff")).toFile("public/apple-icon.png");
await sharp(await square(192, "#ffffff")).toFile("public/icon-192.png");
await sharp(await square(512, "#ffffff")).toFile("public/icon-512.png");
await (await cutout(await square(64, "#ffffff"))).toFile("src/app/icon.png");
console.log(`✓ logo assets (lockup ${W}×${H}, icon width ${iconEnd + 1}px)`);
