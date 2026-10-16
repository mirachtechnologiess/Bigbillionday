import "server-only";
import { chat, chatJson, visionJson, TEXT_MODEL, VISION_MODEL } from "./ai";
import { toVisionDataUrl } from "./storage";
import { WATCH_ATTRS, slugify } from "./utils";

export { TEXT_MODEL, VISION_MODEL };

/* ════════════════════ Normalisation ════════════════════ */

const SYNONYMS = {
  movement: {
    automatic: "Automatic", "self-winding": "Automatic", "self winding": "Automatic", "auto": "Automatic",
    quartz: "Quartz", battery: "Quartz",
    "hand-wound": "Mechanical (Hand-wound)", "hand wound": "Mechanical (Hand-wound)", manual: "Mechanical (Hand-wound)", mechanical: "Mechanical (Hand-wound)",
    solar: "Solar", "eco-drive": "Solar", "eco drive": "Solar", "tough solar": "Solar",
    kinetic: "Kinetic", smart: "Smart", smartwatch: "Smart", "chronograph": "Chronograph Quartz", "quartz chronograph": "Chronograph Quartz",
  },
  display: { analogue: "Analog", analog: "Analog", digital: "Digital", "ana-digi": "Analog-Digital", "analog-digital": "Analog-Digital", "analog digital": "Analog-Digital", hybrid: "Analog-Digital", smart: "Smart", touchscreen: "Smart", amoled: "Smart" },
  caseMaterial: {
    steel: "Stainless Steel", "stainless": "Stainless Steel", "316l": "Stainless Steel", metal: "Stainless Steel", silver: "Stainless Steel",
    titanium: "Titanium", gold: "Gold PVD", "gold-tone": "Gold PVD", "gold plated": "Gold PVD", "yellow gold": "Gold PVD",
    "rose gold": "Rose Gold PVD", "rose-gold": "Rose Gold PVD", "pink gold": "Rose Gold PVD", ceramic: "Ceramic", brass: "Brass",
    resin: "Resin", plastic: "Resin", polycarbonate: "Resin", "bio-based": "Resin", carbon: "Carbon", "forged carbon": "Carbon", aluminium: "Aluminium", aluminum: "Aluminium", alloy: "Aluminium",
  },
  caseShape: { round: "Round", circular: "Round", square: "Square", rectangular: "Rectangle", rectangle: "Rectangle", tank: "Rectangle", tonneau: "Tonneau", barrel: "Tonneau", octagonal: "Octagon", octagon: "Octagon", hexagonal: "Octagon", cushion: "Cushion" },
  strapMaterial: {
    bracelet: "Stainless Steel", steel: "Stainless Steel", metal: "Stainless Steel", "stainless": "Stainless Steel", link: "Stainless Steel", jubilee: "Stainless Steel", oyster: "Stainless Steel",
    leather: "Leather", "genuine leather": "Leather", croc: "Leather", suede: "Leather", silicone: "Silicone", rubber: "Rubber", resin: "Rubber", fkm: "Rubber",
    nylon: "Nylon", nato: "Nylon", fabric: "Nylon", canvas: "Nylon", mesh: "Mesh", milanese: "Mesh", ceramic: "Ceramic", titanium: "Titanium",
  },
  glass: { sapphire: "Sapphire", "sapphire crystal": "Sapphire", mineral: "Mineral", "hardened mineral": "Mineral", hardlex: "Hardlex", acrylic: "Acrylic", hesalite: "Acrylic", plexi: "Acrylic", gorilla: "Gorilla Glass" },
  dialColor: { black: "Black", blue: "Blue", navy: "Blue", white: "White", cream: "White", ivory: "White", silver: "Silver", green: "Green", olive: "Green", grey: "Grey", gray: "Grey", anthracite: "Grey", gunmetal: "Grey", gold: "Gold", "rose gold": "Rose Gold", pink: "Rose Gold", brown: "Brown", chocolate: "Brown", red: "Red", burgundy: "Red", champagne: "Champagne", skeleton: "Skeleton", openwork: "Skeleton", "mother of pearl": "Mother of Pearl", mop: "Mother of Pearl" },
};

/** Map any free-text value onto the nearest allowed WATCH_ATTRS option (or null). */
export function normalizeAttr(key, value) {
  const allowed = WATCH_ATTRS[key];
  if (!allowed || value === null || value === undefined) return null;
  if (Array.isArray(value)) value = value[0];
  const raw = String(value).trim();
  if (!raw || /^(null|unknown|n\/?a|none|-)$/i.test(raw)) return null;
  const v = raw.toLowerCase();

  if (key === "waterResistance") {
    let m = v.match(/(\d+(?:\.\d+)?)\s*(atm|bar)/);
    let meters = m ? parseFloat(m[1]) * 10 : null;
    if (meters === null) {
      m = v.match(/(\d+)\s*(m|meter|metre)/) || v.match(/(\d+)/);
      if (m) meters = parseInt(m[1], 10);
      const ft = v.match(/(\d+)\s*(ft|feet)/);
      if (ft) meters = Math.round(parseInt(ft[1], 10) * 0.3048);
    }
    if (meters === null) return /splash|resist/.test(v) ? "30m" : null;
    if (meters >= 300) return "300m+";
    if (meters >= 200) return "200m";
    if (meters >= 100) return "100m";
    if (meters >= 50) return "50m";
    return "30m";
  }

  const exact = allowed.find((a) => a.toLowerCase() === v);
  if (exact) return exact;
  const syn = SYNONYMS[key] || {};
  // longest synonym key that appears in the value wins (so "rose gold" beats "gold")
  const hit = Object.keys(syn)
    .sort((a, b) => b.length - a.length)
    .find((k) => v.includes(k));
  if (hit) return syn[hit];
  const contains = allowed.find((a) => v.includes(a.toLowerCase()) || a.toLowerCase().includes(v));
  if (contains) return contains;
  // token overlap fallback
  const toks = new Set(v.split(/[^a-z0-9]+/).filter((t) => t.length > 2));
  let best = null;
  let bestScore = 0;
  for (const a of allowed) {
    const score = a.toLowerCase().split(/[^a-z0-9]+/).filter((t) => toks.has(t)).length;
    if (score > bestScore) {
      best = a;
      bestScore = score;
    }
  }
  return best;
}

export function normalizeGender(g) {
  const v = String(g || "").toLowerCase();
  if (/women|lady|ladies|female|her\b/.test(v)) return "WOMEN";
  if (/kid|child|boy|girl/.test(v)) return "KIDS";
  if (/\bmen\b|\bman\b|male|gents|his\b/.test(v)) return "MEN";
  return "UNISEX";
}

const clip = (s, n) => {
  if (!s) return "";
  s = String(s).replace(/\s+/g, " ").trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), n - 15)).replace(/[,;:\-–\s]+$/, "") + "…";
};
const clipHard = (s, n) => {
  s = String(s || "").replace(/\s+/g, " ").trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const sp = cut.lastIndexOf(" ");
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[,;:\-–|\s]+$/, "");
};

/**
 * Last-line safety net: strip authenticity / official-warranty claims the model may still produce.
 * Works on plain text and on our tiny HTML subset.
 */
const CLAIM_PATTERNS = [
  /\b(?:comes\s+)?(?:with\s+)?(?:an?\s+)?(?:official\s+|original\s+)?(?:authenticity|authentication)\s+(?:certificate|card|guarantee)s?\b/gi,
  /\b(?:with\s+|includes?\s+|backed\s+by\s+)?(?:an?\s+|the\s+)?(?:official|brand|manufacturer'?s?|company|international|global)\s+warranty(?:\s+card)?\b/gi,
  /\b(?:(?:from|by|via|through)\s+)?(?:an?\s+|the\s+|our\s+)?(?:official\s+)?authori[sz]ed\s+(?:dealer|retailer|seller|reseller|distributor|partner|store)s?\b/gi,
  /\b100\s*%\s*(?:genuine|original|authentic|real)\b/gi,
  /\bguaranteed\s+(?:genuine|original|authentic)\b/gi,
  /\b(?:genuine|authentic|original|authori[sz]ed|certified|licensed)\s+(?=(?:product|watch|watches|piece|brand|item|timepiece|leather)\b)/gi,
  /\b(?:genuine|authentic|authenticity|authori[sz]ed)\b/gi,
];
export function scrubClaims(text) {
  if (!text) return text;
  let s = String(text);
  for (const re of CLAIM_PATTERNS) s = s.replace(re, "");
  return s
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,;:])\1+/g, "$1")
    .replace(/(<(?:p|li|strong)>)\s+/gi, "$1")
    .replace(/\s+(<\/(?:p|li|strong)>)/gi, "$1")
    .replace(/^[\s,;:–-]+/, "")
    .trim();
}
const scrubList = (arr) => (Array.isArray(arr) ? arr.map(scrubClaims).filter(Boolean) : arr);
/** Recursively scrub every string in an AI answer object. */
function scrubAll(v) {
  if (typeof v === "string") return scrubClaims(v);
  if (Array.isArray(v)) return v.map(scrubAll);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrubAll(x)]));
  return v;
}

/** Allow only p / ul / li / strong (+ br, em, h3 for translations). Strips every attribute. */
export function sanitizeHtml(html, extra = []) {
  if (!html) return "";
  const allow = new Set(["p", "ul", "li", "strong", ...extra]);
  let s = String(html)
    .replace(/```(?:html)?/gi, "")
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*b\s*>/gi, "<strong>")
    .replace(/<\s*\/\s*b\s*>/gi, "</strong>")
    .replace(/<\s*\/?\s*([a-z0-9]+)[^>]*>/gi, (m, tag) => {
      tag = tag.toLowerCase();
      if (!allow.has(tag)) return "";
      return m.trim().startsWith("</") ? `</${tag}>` : `<${tag}>`;
    });
  s = s.trim();
  if (s && !/^<(p|ul|h3)>/i.test(s)) s = `<p>${s}</p>`;
  return s;
}

const cleanTags = (arr, max = 15) =>
  [...new Set((Array.isArray(arr) ? arr : String(arr || "").split(","))
    .map((t) => String(t).toLowerCase().replace(/^#/, "").replace(/[^a-z0-9\s\-]/g, "").replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 1 && t.length <= 40))].slice(0, max);

const cleanList = (arr, max, len = 140) =>
  (Array.isArray(arr) ? arr : [])
    .map((x) => String(typeof x === "object" && x ? x.text || x.title || Object.values(x)[0] : x).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((x) => x.slice(0, len))
    .slice(0, max);

/* ════════════════════ Prompts ════════════════════ */

const ATTR_HELP = Object.entries(WATCH_ATTRS)
  .map(([k, v]) => `- ${k}: one of ${JSON.stringify(v)} or null`)
  .join("\n");

const COPY_SYSTEM = `You are the senior copywriter for "BigBillionDay", an Indian online watch store (bigbillionday.store, Cash on Delivery across India).
Voice: confident, warm, aspirational but honest; written for Indian buyers (gifting for weddings/festivals/office wear, value for money, COD convenience); Indian English; prices in ₹ only when asked.
Hard rules:
- NEVER describe any product as "original", "genuine", "100% genuine", "authentic", "authorised"/"authorized", "official", "certified", "licensed" or "brand new from the brand", and NEVER mention an authenticity certificate, brand/manufacturer/official warranty, warranty card or authorised dealer/retailer, even if the input or admin notes mention them. Brand names may be used only to describe style/design.
- Do not say "genuine leather"; just say "leather".
- Never invent technical numbers (calibre, power reserve, jewels) that are not in the input.
- No emojis. No ALL CAPS. No markdown.
- Output ONLY valid JSON, nothing else.`;

/** Step 1 — vision model reads the photo. */
export async function identifyWatch(imageDataUrl, hint = "") {
  const prompt = `You are an expert horologist cataloguing a watch for an Indian e-commerce store. Study this product photo carefully (logo, dial text, bezel, case, crown, strap, buckle, sub-dials).
${hint ? `Seller hint: ${hint}\n` : ""}Return ONLY minified JSON with exactly these keys:
{"brand":string|null,"model":string|null,"modelNumber":string|null,"gender":"MEN"|"WOMEN"|"UNISEX"|"KIDS","movement":..,"display":..,"caseMaterial":..,"caseShape":..,"caseSize":integer millimetres estimate|null,"dialColor":..,"strapMaterial":..,"strapColor":string|null,"glass":..,"waterResistance":..,"features":string[],"visibleText":string[],"style":string,"confidence":number 0-1}
Allowed values (choose the closest; null if you cannot tell):
${ATTR_HELP}
Guidance:
- brand: ONLY if a logo or brand name is legible on dial/case/strap. Otherwise null.
- modelNumber: only if printed/legible. Never guess a reference number.
- features from: Chronograph, Date, Day-Date, Tachymeter, Luminous hands, Rotating bezel, GMT, Moon phase, Skeleton dial, Open heart, Screw-down crown, Heart-rate, SpO2, Bluetooth calling, Notifications, Step counter, Alarm, Stopwatch, Backlight, World time.
- sub-dials usually mean Chronograph; "AUTOMATIC" text or exhibition rotor means Automatic; LCD means Digital; touchscreen/rectangular smart display means Smart.
- caseSize: typical men 40-44, women 28-36 unless clearly otherwise.
- waterResistance: read it from dial text if printed (e.g. "WR 100M", "10 BAR"); otherwise estimate conservatively.
- style: 2-4 words, e.g. "dress", "diver sport", "luxury chronograph", "minimalist casual".`;
  return visionJson({ task: "product-vision", imageUrl: imageDataUrl, prompt, maxTokens: 900 });
}

/** Normalise the raw vision answer onto our schema fields. */
export function normalizeVision(raw = {}) {
  const out = {
    brandName: raw.brand && !/unknown|unbranded|generic/i.test(raw.brand) ? String(raw.brand).trim().slice(0, 60) : null,
    model: raw.model ? String(raw.model).trim().slice(0, 100) : null,
    modelNumber: raw.modelNumber && /[0-9]/.test(raw.modelNumber) ? String(raw.modelNumber).trim().slice(0, 60) : null,
    gender: normalizeGender(raw.gender),
    caseSize: Number.isFinite(Number(raw.caseSize)) && raw.caseSize ? Math.min(60, Math.max(18, Math.round(Number(raw.caseSize)))) : null,
    strapColor: raw.strapColor ? String(raw.strapColor).replace(/\s+/g, " ").trim().slice(0, 40) : null,
    features: cleanList(raw.features, 12, 40),
    visibleText: cleanList(raw.visibleText, 12, 60),
    style: raw.style ? String(raw.style).slice(0, 60) : null,
    confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0.5)),
  };
  for (const k of Object.keys(WATCH_ATTRS)) out[k] = normalizeAttr(k, raw[k]);
  if (out.display === "Smart" && !out.movement) out.movement = "Smart";
  if (out.movement === "Smart" && !out.display) out.display = "Smart";
  if (out.features.some((f) => /chrono/i.test(f)) && out.movement === "Quartz") out.movement = "Chronograph Quartz";
  return out;
}

/** Step 2 — text model writes copy & SEO from the identified attributes. */
export async function writeProductCopy({ attrs, brandName, imageCount = 1, extra = "" }) {
  const facts = JSON.stringify({ brand: brandName || null, ...attrs });
  const user = `Write the full product listing for this watch.
FACTS (from catalogue/vision; null = unknown, do not invent): ${facts}
${extra ? `Extra notes from the admin: ${extra}\n` : ""}
Return JSON with exactly these keys:
{
 "name": "SEO product name, 45-80 chars: Brand + model/series (if known) + key trait + 'Watch for Men/Women' e.g. 'Fossil Grant Chronograph Blue Dial Leather Strap Watch for Men'",
 "shortDescription": "one sentence, max 155 chars",
 "description": "HTML using ONLY <p>, <ul>, <li>, <strong>. 120-220 words. 2 short paragraphs + a <ul> of 4-6 spec bullets. Mention occasions & gifting, Cash on Delivery across India.",
 "highlights": ["4-6 short benefit-led bullet strings, max 70 chars each"],
 "tags": ["8-15 lowercase search keywords Indian shoppers type, e.g. 'blue dial watch', 'chronograph watch for men', 'gift for husband'"],
 "seoTitle": "max 60 chars, primary keyword first",
 "seoDesc": "max 155 chars, includes a call to action like 'Shop now with COD'",
 "altTexts": [${Array.from({ length: Math.max(1, Math.min(imageCount, 8)) }, (_, i) => `"alt text for photo ${i + 1}, max 120 chars"`).join(",")}],
 "priceBand": ${brandName ? '{"min": number, "max": number, "note": "short reason"} typical Indian street price range in INR for this brand/type, or null if unsure' : "null"}
}`;
  return chatJson({ task: "product-copy", system: COPY_SYSTEM, messages: [{ role: "user", content: user }], maxTokens: 1600, temperature: 0.45 });
}

/** Clean & clamp the text-model answer. */
export function normalizeCopy(raw = {}, { brandName, attrs = {} } = {}) {
  raw = scrubAll(raw);
  const fallbackName = [brandName, attrs.model, attrs.dialColor && `${attrs.dialColor} Dial`, attrs.movement, "Watch"].filter(Boolean).join(" ");
  const name = clipHard(raw.name || fallbackName, 110);
  let priceBand = null;
  if (raw.priceBand && typeof raw.priceBand === "object") {
    const min = Math.round(Number(raw.priceBand.min));
    const max = Math.round(Number(raw.priceBand.max));
    if (min > 0 && max >= min && max < 5e7) priceBand = { min, max, note: String(raw.priceBand.note || "").slice(0, 140) };
  }
  return {
    name,
    slug: slugify(name),
    shortDescription: clip(raw.shortDescription, 160),
    description: sanitizeHtml(raw.description),
    highlights: cleanList(raw.highlights, 6, 90),
    tags: cleanTags(raw.tags, 15),
    seoTitle: clipHard(raw.seoTitle || name, 60),
    seoDesc: clip(raw.seoDesc || raw.shortDescription, 155),
    altTexts: cleanList(raw.altTexts, 8, 125),
    priceBand,
  };
}

/**
 * Full photo → product pipeline.
 * @param {Buffer} buffer image bytes
 * @param {{brands?: {id,name}[], imageCount?: number, hint?: string}} opts
 */
export async function productFromImage(buffer, { brands = [], imageCount = 1, hint = "" } = {}) {
  const dataUrl = await toVisionDataUrl(buffer, 768);
  const rawVision = await identifyWatch(dataUrl, hint);
  const attrs = normalizeVision(rawVision);

  // Match brand against existing catalogue (case-insensitive, also tolerant of "G-Shock" vs "Casio G-Shock")
  let brandMatch = null;
  if (attrs.brandName) {
    const n = attrs.brandName.toLowerCase().replace(/[^a-z0-9]/g, "");
    brandMatch =
      brands.find((b) => b.name.toLowerCase() === attrs.brandName.toLowerCase()) ||
      brands.find((b) => b.name.toLowerCase().replace(/[^a-z0-9]/g, "") === n) ||
      brands.find((b) => {
        const bn = b.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        return bn.length > 2 && (n.includes(bn) || bn.includes(n));
      }) ||
      null;
  }
  const brandName = brandMatch?.name || attrs.brandName;

  const rawCopy = await writeProductCopy({ attrs, brandName, imageCount, extra: hint });
  const copy = normalizeCopy(rawCopy, { brandName, attrs });

  const { brandName: _b, model, visibleText, style, confidence, ...specFields } = attrs;
  return {
    fields: { ...specFields, ...copy, aiGenerated: true },
    brand: { detected: attrs.brandName, match: brandMatch ? { id: brandMatch.id, name: brandMatch.name } : null },
    meta: { model, visibleText, style, confidence, models: { vision: VISION_MODEL, text: TEXT_MODEL } },
  };
}

/* ════════════════════ Per-field helpers ════════════════════ */

const productFacts = (p) =>
  JSON.stringify({
    name: p.name,
    brand: p.brand?.name || p.brandName || null,
    modelNumber: p.modelNumber || null,
    gender: p.gender,
    price: p.price ? `₹${p.price}` : null,
    movement: p.movement, display: p.display, caseMaterial: p.caseMaterial, caseSize: p.caseSize ? `${p.caseSize}mm` : null,
    caseShape: p.caseShape, dialColor: p.dialColor, strapMaterial: p.strapMaterial, strapColor: p.strapColor,
    glass: p.glass, waterResistance: p.waterResistance, features: p.features,
    shortDescription: p.shortDescription || null,
    description: p.description ? String(p.description).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 1200) : null,
  });

export async function aiSeo(p) {
  const r = await chatJson({
    task: "seo",
    system: COPY_SYSTEM,
    maxTokens: 400,
    messages: [{ role: "user", content: `Write Google SEO metadata for this product page. FACTS: ${productFacts(p)}\nReturn JSON {"seoTitle":"<=60 chars, primary keyword first, brand included","seoDesc":"<=155 chars, benefit + 'COD available' style CTA","shortDescription":"<=155 chars one-liner"}` }],
  });
  return { seoTitle: clipHard(scrubClaims(r.seoTitle), 60), seoDesc: clip(scrubClaims(r.seoDesc), 155), shortDescription: clip(scrubClaims(r.shortDescription), 160) };
}

export async function aiTags(p) {
  const r = await chatJson({
    task: "tags",
    system: COPY_SYSTEM,
    maxTokens: 300,
    messages: [{ role: "user", content: `Generate 8-15 lowercase search tags Indian shoppers would type to find this watch (mix of style, colour, occasion, gift, audience). FACTS: ${productFacts(p)}\nReturn JSON {"tags":[...]}` }],
  });
  return { tags: cleanTags(scrubList(r.tags), 15) };
}

export async function aiRewriteDescription(p, tone = "premium") {
  const r = await chatJson({
    task: "rewrite-description",
    system: COPY_SYSTEM,
    maxTokens: 1000,
    messages: [{ role: "user", content: `Rewrite the product description in a ${tone} tone. FACTS: ${productFacts(p)}\nReturn JSON {"description":"HTML using ONLY <p>,<ul>,<li>,<strong>; 120-220 words; 2 short paragraphs + a 4-6 item spec <ul>","highlights":["4-6 benefit bullets <=70 chars"]}` }],
  });
  return { description: sanitizeHtml(scrubClaims(r.description)), highlights: cleanList(scrubList(r.highlights), 6, 90) };
}

export async function aiHighlights(p) {
  const r = await chatJson({
    task: "highlights",
    system: COPY_SYSTEM,
    maxTokens: 400,
    messages: [{ role: "user", content: `Write 4-6 short benefit-led highlights (<=70 chars each) for this watch. FACTS: ${productFacts(p)}\nReturn JSON {"highlights":[...]}` }],
  });
  return { highlights: cleanList(scrubList(r.highlights), 6, 90) };
}

export async function aiAltText(buffer, p) {
  const dataUrl = await toVisionDataUrl(buffer, 640);
  const r = await visionJson({
    task: "alt-text",
    imageUrl: dataUrl,
    maxTokens: 200,
    prompt: `Write one concise, descriptive image alt text (max 120 chars) for this product photo of "${p?.name || "a wristwatch"}"${p?.brand?.name || p?.brandName ? ` by ${p.brand?.name || p.brandName}` : ""}. Describe the angle and visible details (dial colour, strap, case). No "image of". Return JSON {"alt":"..."}`,
  });
  return clipHard(scrubClaims(r.alt || ""), 125);
}

export async function aiTranslate(p, lang = "Tamil") {
  const r = await chatJson({
    task: `translate-${lang.toLowerCase()}`,
    system: "You are a professional e-commerce translator for Indian languages. Keep brand names, model numbers and units in English. Never add or keep any claim that the product is original, genuine, authentic, authorised or carries a brand/official warranty — drop such phrases. Output ONLY JSON.",
    maxTokens: 1400,
    messages: [{ role: "user", content: `Translate this watch description into natural, conversational ${lang} for Indian shoppers. Keep it to 80-150 words. Use ONLY <p>, <ul>, <li>, <strong>.\nSOURCE: ${productFacts(p)}\nReturn JSON {"html":"..."}` }],
  });
  const title = lang === "Hindi" ? "हिंदी में विवरण" : lang === "Tamil" ? "தமிழில் விவரம்" : lang;
  return { html: `<h3>${title}</h3>${sanitizeHtml(r.html)}` };
}

export async function aiBrandDescription(name, country) {
  const r = await chatJson({
    task: "brand-description",
    system: COPY_SYSTEM,
    maxTokens: 600,
    messages: [{ role: "user", content: `Write a brand page intro for the watch brand "${name}"${country ? ` (${country})` : ""}. Only widely-known facts about the brand's design style; if unsure keep it general about style. Do not imply we are an authorised/official seller or that products are original/genuine or carry brand warranty. Return JSON {"description":"2 short paragraphs plain text, 70-120 words","seoTitle":"<=60 chars","seoDesc":"<=155 chars","country":"country of origin or null"}` }],
  });
  return { description: scrubClaims(String(r.description || "").replace(/<[^>]+>/g, "")), seoTitle: clipHard(scrubClaims(r.seoTitle), 60), seoDesc: clip(scrubClaims(r.seoDesc), 155), country: r.country && r.country !== "null" ? String(r.country).slice(0, 40) : null };
}

/** Enrich an imported CSV row: fills only missing fields. */
export async function aiEnrichRow(row) {
  const missing = ["shortDescription", "description", "tags", "seoTitle", "seoDesc", "highlights"].filter((k) => !row[k] || (Array.isArray(row[k]) && !row[k].length));
  const specKeys = Object.keys(WATCH_ATTRS);
  const r = await chatJson({
    task: "import-enrich",
    system: COPY_SYSTEM,
    maxTokens: 1500,
    messages: [{
      role: "user",
      content: `Complete this watch product record. FACTS: ${productFacts(row)}
Fill ONLY these missing copy fields: ${JSON.stringify(missing)}. Also infer the spec fields if they can be derived from the name/description (else null).
Allowed spec values:\n${ATTR_HELP}
Return JSON {"shortDescription":"<=155","description":"HTML <p>,<ul>,<li>,<strong> only, 120-200 words","highlights":[],"tags":[],"seoTitle":"<=60","seoDesc":"<=155","gender":"MEN|WOMEN|UNISEX|KIDS",${specKeys.map((k) => `"${k}":null`).join(",")}}`,
    }],
  });
  const out = {};
  Object.assign(r, scrubAll({ shortDescription: r.shortDescription, description: r.description, highlights: r.highlights, tags: r.tags, seoTitle: r.seoTitle, seoDesc: r.seoDesc }));
  if (missing.includes("shortDescription")) out.shortDescription = clip(r.shortDescription, 160);
  if (missing.includes("description")) out.description = sanitizeHtml(r.description);
  if (missing.includes("highlights")) out.highlights = cleanList(r.highlights, 6, 90);
  if (missing.includes("tags")) out.tags = cleanTags(r.tags);
  if (missing.includes("seoTitle")) out.seoTitle = clipHard(r.seoTitle, 60);
  if (missing.includes("seoDesc")) out.seoDesc = clip(r.seoDesc, 155);
  for (const k of specKeys) if (!row[k]) { const v = normalizeAttr(k, r[k]); if (v) out[k] = v; }
  if (!row.gender && r.gender) out.gender = normalizeGender(r.gender);
  return out;
}

/* ════════════════════ Store-level AI ════════════════════ */

/** Classify reviews: [{id, rating, title, body}] → [{id, sentiment, spam, abusive, reason}] */
export async function aiClassifyReviews(reviews) {
  if (!reviews.length) return [];
  const r = await chatJson({
    task: "review-moderation",
    system: "You moderate product reviews for an Indian watch store. Reviews may be in English, Tamil, Hindi or Tanglish/Hinglish. Output ONLY JSON.",
    maxTokens: 1500,
    messages: [{
      role: "user",
      content: `Classify each review. spam = ads, links, phone numbers, gibberish, unrelated; abusive = slurs, hate, harassment, explicit content.
REVIEWS: ${JSON.stringify(reviews.map((x) => ({ id: x.id, rating: x.rating, title: x.title, body: String(x.body).slice(0, 600) })))}
Return JSON {"results":[{"id":"...","sentiment":"positive|neutral|negative","spam":bool,"abusive":bool,"reason":"<=80 chars"}]}`,
    }],
  });
  const list = Array.isArray(r) ? r : r.results || [];
  return list
    .filter((x) => x && x.id)
    .map((x) => ({
      id: String(x.id),
      sentiment: ["positive", "neutral", "negative"].includes(String(x.sentiment).toLowerCase()) ? String(x.sentiment).toLowerCase() : "neutral",
      spam: Boolean(x.spam),
      abusive: Boolean(x.abusive),
      reason: String(x.reason || "").slice(0, 120),
    }));
}

export async function aiCopywriter({ storeName, current, brief = "" }) {
  const r = await chatJson({
    task: "home-copy",
    system: COPY_SYSTEM,
    temperature: 0.8,
    maxTokens: 900,
    messages: [{
      role: "user",
      content: `Write homepage copy options for "${storeName}". Current: ${JSON.stringify(current)}. ${brief ? `Brief: ${brief}` : "Upcoming Indian festive/sale season tone is welcome but optional."}
Return JSON {"options":[{"heroTitle":"2 short lines separated by \\n, max 40 chars total, poetic & premium","heroSubtitle":"max 110 chars","announcement":"max 80 chars, use · as separator"}]} with exactly 4 distinct options.`,
    }],
  });
  return (r.options || (Array.isArray(r) ? r : []))
    .slice(0, 6)
    .map((o) => ({
      heroTitle: scrubClaims(String(o.heroTitle || "").replace(/\\n/g, "\n")).slice(0, 60),
      heroSubtitle: clip(scrubClaims(o.heroSubtitle), 140),
      announcement: clip(scrubClaims(o.announcement), 100),
    }))
    .filter((o) => o.heroTitle);
}

export async function aiInsights(metrics) {
  const r = await chatJson({
    task: "insights",
    system: "You are a sharp e-commerce growth analyst for an Indian Cash-on-Delivery watch store. Be specific, numeric and actionable; refer to products/pincodes by name from the data. Never invent numbers that are not in the data. Output ONLY JSON.",
    maxTokens: 1200,
    messages: [{ role: "user", content: `Last-30-day store metrics (INR):\n${JSON.stringify(metrics)}\nGive exactly 5 concise, actionable recommendations. Return JSON [{"title":"<=60 chars","detail":"<=240 chars, what to do and why, citing the numbers","impact":"high|medium|low"}]` }],
  });
  const list = Array.isArray(r) ? r : r.recommendations || r.insights || [];
  return list.slice(0, 5).map((x) => ({
    title: String(x.title || "").slice(0, 80),
    detail: String(x.detail || "").slice(0, 320),
    impact: ["high", "medium", "low"].includes(String(x.impact).toLowerCase()) ? String(x.impact).toLowerCase() : "medium",
  }));
}

/** Natural-language Q&A over a precomputed metrics snapshot (the model never touches the DB). */
export async function aiAsk(question, snapshot) {
  const answer = await chat({
    task: "ask-store",
    system:
      "You answer questions from the owner of an Indian watch store using ONLY the JSON snapshot provided. If the data does not contain the answer, say so and suggest which admin page to check. Be concise: a direct answer first, then up to 4 bullet points with numbers. Currency is INR (₹, Indian digit grouping). Plain text, '-' for bullets.",
    maxTokens: 700,
    temperature: 0.2,
    messages: [{ role: "user", content: `SNAPSHOT:\n${JSON.stringify(snapshot)}\n\nQUESTION: ${String(question).slice(0, 500)}` }],
  });
  return answer.trim();
}

/* ════════════════════ Banner copy ════════════════════ */

const BANNER_SYSTEM = `You write homepage sale-banner copy for "BigBillionDay", an Indian online watch store (Cash on Delivery across India).
Tone: short, punchy, high-energy Indian e-commerce (think festive sale banners) — clear value, urgency without lying.
Hard rules:
- NEVER use the words original, genuine, authentic, authorised/authorized, official, certified or licensed, and NEVER mention brand/manufacturer/official warranty, authenticity certificates or authorised dealers.
- Never invent a discount bigger than the one given; if no discount is given, focus on style/price/COD instead of a % number.
- No emojis. No markdown. Output ONLY valid JSON.`;

/**
 * Banner copy from an optional product + discount.
 * @param {{product?: object|null, discount?: string, brief?: string, placement?: string, current?: object}} input
 */
export async function aiBannerCopy({ product = null, discount = "", brief = "", placement = "home_hero", current = {} } = {}) {
  const facts = product
    ? {
        name: product.name,
        brand: product.brand,
        price: product.price ? `₹${product.price}` : null,
        mrp: product.mrp && product.mrp > product.price ? `₹${product.mrp}` : null,
        offPercent: product.off || null,
        gender: product.gender || null,
        dialColor: product.dialColor || null,
        movement: product.movement || null,
        strap: product.strapMaterial || null,
      }
    : null;
  const r = await chatJson({
    task: "banner-copy",
    system: BANNER_SYSTEM,
    temperature: 0.8,
    maxTokens: 400,
    messages: [{
      role: "user",
      content: `Write ONE banner for placement "${placement}".
${facts ? `FEATURED PRODUCT: ${JSON.stringify(facts)}` : "No specific product — a store-wide watch sale banner."}
${discount ? `DISCOUNT / OFFER: ${String(discount).slice(0, 80)}` : ""}
${brief ? `ADMIN BRIEF: ${String(brief).slice(0, 200)}` : ""}
${current?.title ? `Current copy (write something fresher): ${JSON.stringify({ title: current.title, subtitle: current.subtitle, badge: current.badge })}` : ""}
Return JSON {"badge":"big discount callout, max 18 chars, e.g. 'UP TO 70% OFF' or 'FLAT ₹500 OFF' or 'NEW ARRIVAL'","title":"headline, 2-6 words, max 40 chars","subtitle":"one line, max 90 chars, value + COD/free-shipping style hook","ctaLabel":"2-3 words, max 18 chars, e.g. 'Grab the deal'"}`,
    }],
  });
  const o = Array.isArray(r) ? r[0] || {} : r;
  return {
    badge: clipHard(scrubClaims(o.badge || ""), 40).toUpperCase(),
    title: clipHard(scrubClaims(o.title || ""), 80),
    subtitle: clip(scrubClaims(o.subtitle || ""), 160),
    ctaLabel: clipHard(scrubClaims(o.ctaLabel || ""), 30),
  };
}
