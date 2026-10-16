import * as THREE from "three";

function shade(hex, amt) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt)));
  return `#${c.getHexString()}`;
}

function cssVarFont(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v ? `${v}, ${fallback}` : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Paints a sunburst dial onto a canvas: radial brushed rays, vignette, minute track,
 * lume plots, date window and the maker's signature. Returns a THREE.CanvasTexture.
 */
export function createDialTexture({ size = 1024, dialColor = "#0d3236", accent = "#e6cf9f", brand = "BIGBILLIONDAY" } = {}) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d");
  const c = size / 2;
  const R = size / 2;

  ctx.fillStyle = dialColor;
  ctx.fillRect(0, 0, size, size);

  // Sunburst: thin alternating wedges radiating from the centre.
  const rays = 240;
  const light = shade(dialColor, 0.09);
  const dark = shade(dialColor, -0.05);
  for (let i = 0; i < rays; i++) {
    const a0 = (i / rays) * Math.PI * 2;
    const a1 = ((i + 1) / rays) * Math.PI * 2;
    // Brightness follows a cos² band so it reads like light catching brushed metal.
    const band = Math.pow(Math.cos(a0 * 1 + 0.6), 2);
    ctx.globalAlpha = 0.18 + band * 0.55;
    ctx.fillStyle = i % 2 ? light : dark;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.arc(c, c, R, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Vignette towards the rehaut.
  const vg = ctx.createRadialGradient(c, c, R * 0.15, c, c, R);
  vg.addColorStop(0, "rgba(255,255,255,0.06)");
  vg.addColorStop(0.7, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, size, size);

  // Minute track.
  ctx.save();
  ctx.translate(c, c);
  for (let i = 0; i < 60; i++) {
    const five = i % 5 === 0;
    ctx.save();
    ctx.rotate((i / 60) * Math.PI * 2);
    ctx.strokeStyle = five ? accent : "rgba(255,255,255,0.55)";
    ctx.lineWidth = five ? size * 0.004 : size * 0.0022;
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.965);
    ctx.lineTo(0, -R * (five ? 0.9 : 0.93));
    ctx.stroke();
    ctx.restore();
  }
  // Inner chapter ring.
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = size * 0.0015;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.885, 0, Math.PI * 2);
  ctx.stroke();

  // Lume plots outside each hour index.
  for (let h = 0; h < 12; h++) {
    if (h === 3) continue;
    const a = (h / 12) * Math.PI * 2;
    ctx.fillStyle = "#cfe9c4";
    ctx.beginPath();
    ctx.arc(Math.sin(a) * R * 0.86, -Math.cos(a) * R * 0.86, size * 0.0075, 0, Math.PI * 2);
    ctx.fill();
  }

  // Date window at 3 o'clock.
  const day = new Date().getDate();
  const dw = size * 0.075;
  const dh = size * 0.06;
  const dx = R * 0.66;
  ctx.fillStyle = "#f4efe4";
  ctx.fillRect(dx - dw / 2, -dh / 2, dw, dh);
  ctx.strokeStyle = accent;
  ctx.lineWidth = size * 0.003;
  ctx.strokeRect(dx - dw / 2, -dh / 2, dw, dh);
  ctx.fillStyle = "#111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.round(size * 0.04)}px ${cssVarFont("--font-grotesk", "Helvetica, Arial, sans-serif")}`;
  ctx.fillText(String(day), dx, size * 0.002);

  // Signature.
  const serif = cssVarFont("--font-serif", "Georgia, 'Times New Roman', serif");
  const mono = cssVarFont("--font-mono-face", "ui-monospace, monospace");
  ctx.fillStyle = accent;
  ctx.font = `italic ${Math.round(size * 0.07)}px ${serif}`;
  ctx.fillText("BBD", 0, -R * 0.42);
  ctx.font = `500 ${Math.round(size * 0.026)}px ${mono}`;
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  const spaced = brand.toUpperCase().split("").join(String.fromCharCode(8202));
  ctx.fillText(spaced, 0, -R * 0.29);
  ctx.font = `500 ${Math.round(size * 0.022)}px ${mono}`;
  ctx.fillStyle = accent;
  ctx.fillText("AUTOMATIC", 0, R * 0.33);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `${Math.round(size * 0.018)}px ${mono}`;
  ctx.fillText("100M · SAPPHIRE", 0, R * 0.4);
  ctx.restore();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
