/** Pure helpers shared by server listing pages and client filter UI. */

export const MULTI_KEYS = ["brand", "category", "gender", "movement", "display", "caseMaterial", "strapMaterial", "dialColor", "glass", "waterResistance"];
export const SINGLE_KEYS = ["q", "min", "max", "size", "inStock", "sale", "new"];
export const FILTER_KEYS = [...MULTI_KEYS, ...SINGLE_KEYS];
export const ALL_KEYS = [...FILTER_KEYS, "sort", "page"];

export const SORT_OPTIONS = [
  ["featured", "Relevance"],
  ["newest", "Newest first"],
  ["popular", "Popularity"],
  ["price-asc", "Price: low to high"],
  ["price-desc", "Price: high to low"],
  ["rating", "Top rated"],
];

export const SIZE_BANDS = [
  ["-36", "Under 36 mm"],
  ["36-40", "36 – 40 mm"],
  ["40-44", "40 – 44 mm"],
  ["44-", "44 mm +"],
];

export const PRICE_BANDS = [
  [null, 999, "Under ₹999"],
  [1000, 1299, "₹1,000 – ₹1,299"],
  [1300, 1699, "₹1,300 – ₹1,699"],
  [1700, 2499, "₹1,700 – ₹2,499"],
  [2500, null, "₹2,500 & above"],
];

export const FACET_LABEL = {
  brand: "Brand",
  category: "Category",
  gender: "For",
  movement: "Movement",
  display: "Display",
  caseMaterial: "Case material",
  strapMaterial: "Strap",
  dialColor: "Dial colour",
  glass: "Crystal",
  waterResistance: "Water resistance",
};

export const DIAL_SWATCH = {
  Black: "#111",
  Blue: "#1f3a6b",
  White: "#f4f1ea",
  Silver: "linear-gradient(135deg,#d9d9d9,#8f8f8f)",
  Green: "#1e4d38",
  Grey: "#6b6b6b",
  Gold: "linear-gradient(135deg,#f3d58a,#b8862b)",
  "Rose Gold": "linear-gradient(135deg,#f0c1a8,#a8705a)",
  Brown: "#5a3a26",
  Red: "#7d1d1d",
  Champagne: "#d8c39a",
  Skeleton: "repeating-conic-gradient(#b8bdc6 0 10deg,#3f4550 10deg 30deg)",
  "Mother of Pearl": "linear-gradient(135deg,#f6f1ff,#d6e6f0,#f3dfe8)",
};

/** Flatten Next's searchParams object into { key: string } with only known keys. */
export function cleanParams(sp = {}) {
  const out = {};
  for (const k of ALL_KEYS) {
    let v = sp[k];
    if (Array.isArray(v)) v = v[0];
    if (v == null) continue;
    v = String(v).trim().slice(0, 200);
    if (v) out[k] = v;
  }
  return out;
}

export const splitList = (v) => (v ? String(v).split(",").filter(Boolean) : []);

/** Build "/path?a=b" from an object, dropping empties and page=1. */
export function buildHref(basePath, params = {}) {
  const qs = new URLSearchParams();
  for (const k of ALL_KEYS) {
    const v = params[k];
    if (v == null || v === "") continue;
    if (k === "page" && Number(v) <= 1) continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}

/** Number of distinct active filters (excludes sort/page). */
export function activeFilterCount(params = {}) {
  return FILTER_KEYS.reduce((n, k) => (params[k] ? n + (MULTI_KEYS.includes(k) ? splitList(params[k]).length : 1) : n), 0);
}
