/**
 * Shared (client + server) definition of the product CSV format.
 * The template, the column auto-mapper, the importer and the exporter all use these keys as headers,
 * so an exported file can be re-imported unchanged.
 */

export const IMPORT_FIELDS = [
  { key: "name", label: "Name", group: "Basics", required: true, syn: ["title", "product name", "product title", "product"] },
  { key: "brand", label: "Brand", group: "Basics", required: true, syn: ["brand name", "make", "manufacturer", "vendor"] },
  { key: "sku", label: "SKU", group: "Basics", syn: ["product code", "item code", "code", "variant sku"] },
  { key: "modelNumber", label: "Model number", group: "Basics", syn: ["model", "model no", "model num", "reference", "ref", "ref no"] },
  { key: "category", label: "Category", group: "Basics", syn: ["category name", "type", "product type", "collection"] },
  { key: "gender", label: "Gender", group: "Basics", syn: ["for", "sex", "ideal for", "audience"] },
  { key: "status", label: "Status", group: "Basics", syn: ["state", "published", "visibility"] },
  { key: "price", label: "Price ₹", group: "Pricing & stock", required: true, syn: ["selling price", "sale price", "offer price", "sp", "our price", "variant price"] },
  { key: "mrp", label: "MRP ₹", group: "Pricing & stock", syn: ["list price", "original price", "compare at price", "compare price", "retail price", "variant compare at price"] },
  { key: "costPrice", label: "Cost price ₹", group: "Pricing & stock", syn: ["cost", "purchase price", "cp", "cost per item"] },
  { key: "stock", label: "Stock", group: "Pricing & stock", syn: ["qty", "quantity", "inventory", "units", "inventory qty", "variant inventory qty"] },
  { key: "lowStockAt", label: "Low stock at", group: "Pricing & stock", syn: ["low stock", "reorder level", "low stock threshold", "reorder point"] },
  { key: "codAvailable", label: "COD available", group: "Pricing & stock", syn: ["cod", "cash on delivery"] },
  { key: "shortDescription", label: "Short description", group: "Copy", syn: ["summary", "tagline", "subtitle", "short desc"] },
  { key: "description", label: "Description", group: "Copy", syn: ["long description", "details", "body", "body html", "desc", "product description"] },
  { key: "highlights", label: "Highlights (|)", group: "Copy", syn: ["bullets", "key features", "bullet points", "usp"] },
  { key: "tags", label: "Tags (|)", group: "Copy", syn: ["keywords", "tag"] },
  { key: "seoTitle", label: "SEO title", group: "Copy", syn: ["meta title", "seo name", "page title"] },
  { key: "seoDesc", label: "SEO description", group: "Copy", syn: ["seo description", "meta description", "meta desc"] },
  { key: "movement", label: "Movement", group: "Specs", syn: ["mechanism", "movement type", "calibre", "caliber"] },
  { key: "display", label: "Display", group: "Specs", syn: ["display type", "dial type"] },
  { key: "caseMaterial", label: "Case material", group: "Specs", syn: ["case", "case metal"] },
  { key: "caseSize", label: "Case size (mm)", group: "Specs", syn: ["dial size", "case diameter", "diameter", "size", "case size mm"] },
  { key: "caseShape", label: "Case shape", group: "Specs", syn: ["shape", "dial shape"] },
  { key: "dialColor", label: "Dial colour", group: "Specs", syn: ["dial colour", "dial", "color", "colour"] },
  { key: "strapMaterial", label: "Strap material", group: "Specs", syn: ["strap", "band material", "band", "bracelet"] },
  { key: "strapColor", label: "Strap colour", group: "Specs", syn: ["strap colour", "band color", "band colour"] },
  { key: "glass", label: "Glass", group: "Specs", syn: ["crystal", "glass material", "lens"] },
  { key: "waterResistance", label: "Water resistance", group: "Specs", syn: ["water resistant", "wr", "water resistance depth", "water"] },
  { key: "features", label: "Features (|)", group: "Specs", syn: ["functions", "complications", "feature"] },
  { key: "warranty", label: "Warranty", group: "Specs", syn: ["guarantee", "warranty period"] },
  { key: "weightGrams", label: "Weight (g)", group: "Specs", syn: ["weight", "weight g", "weight gm", "grams"] },
  { key: "images", label: "Images (| URLs)", group: "Media & flags", syn: ["image", "image urls", "image url", "image src", "photos", "pictures", "photo", "img"] },
  { key: "isFeatured", label: "Featured", group: "Media & flags", syn: ["featured", "is featured"] },
  { key: "isNewArrival", label: "New arrival", group: "Media & flags", syn: ["new arrival", "new", "is new"] },
  { key: "isBestSeller", label: "Best seller", group: "Media & flags", syn: ["best seller", "bestseller", "is bestseller"] },
];

export const IMPORT_KEYS = IMPORT_FIELDS.map((f) => f.key);

export const normHeader = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Map CSV headers onto target keys: { [header]: key | "" }. Each key used at most once. */
export function autoMap(headers) {
  const lookup = new Map();
  for (const f of IMPORT_FIELDS) lookup.set(normHeader(f.key), f.key);
  for (const f of IMPORT_FIELDS) for (const s of f.syn) if (!lookup.has(normHeader(s))) lookup.set(normHeader(s), f.key);
  const used = new Set();
  const out = {};
  for (const h of headers) {
    const k = lookup.get(normHeader(h));
    if (k && !used.has(k)) {
      out[h] = k;
      used.add(k);
    } else out[h] = "";
  }
  return out;
}

export const TEMPLATE_EXAMPLES = [
  {
    name: "Casio G-Shock GA-2100 Black Resin Analog-Digital Watch for Men",
    brand: "Casio",
    sku: "",
    modelNumber: "GA-2100-1A1",
    category: "Sports Watches",
    gender: "Men",
    status: "DRAFT",
    price: "₹8,995",
    mrp: "9995",
    costPrice: "6200",
    stock: "12",
    lowStockAt: "3",
    codAvailable: "yes",
    shortDescription: "The octagonal 'CasiOak' in carbon-core resin, tough enough for anything.",
    description: "<p>Slim, light and shock resistant.</p><ul><li>200m water resistance</li><li>World time</li></ul>",
    highlights: "Carbon core guard structure|200m water resistant|Octagonal bezel",
    tags: "g-shock|casioak|black watch|sports watch for men|gift for him",
    seoTitle: "Casio G-Shock GA-2100 CasiOak Black Watch for Men",
    seoDesc: "Shop the Casio G-Shock GA-2100 CasiOak in black. 200m water resistant, world time. Cash on Delivery across India.",
    movement: "Quartz",
    display: "Analog-Digital",
    caseMaterial: "Resin",
    caseSize: "45",
    caseShape: "Octagon",
    dialColor: "Black",
    strapMaterial: "Resin",
    strapColor: "Black",
    glass: "Mineral",
    waterResistance: "20 ATM",
    features: "World time|Stopwatch|Alarm|Backlight",
    warranty: "1 year seller warranty",
    weightGrams: "51",
    images: "https://example.com/ga2100-front.jpg|https://example.com/ga2100-side.jpg",
    isFeatured: "no",
    isNewArrival: "yes",
    isBestSeller: "no",
  },
  {
    name: "Fossil Grant Chronograph Blue Dial Leather Strap Watch for Men",
    brand: "Fossil",
    sku: "",
    modelNumber: "FS5151",
    category: "Dress Watches",
    gender: "Men",
    status: "ACTIVE",
    price: "7495",
    mrp: "10995",
    costPrice: "",
    stock: "5",
    lowStockAt: "2",
    codAvailable: "true",
    shortDescription: "",
    description: "",
    highlights: "",
    tags: "",
    seoTitle: "",
    seoDesc: "",
    movement: "Chronograph",
    display: "Analog",
    caseMaterial: "Stainless steel",
    caseSize: "44mm",
    caseShape: "Round",
    dialColor: "Navy",
    strapMaterial: "Genuine leather",
    strapColor: "Brown",
    glass: "Mineral crystal",
    waterResistance: "50m",
    features: "Chronograph|Date",
    warranty: "",
    weightGrams: "",
    images: "",
    isFeatured: "",
    isNewArrival: "",
    isBestSeller: "",
  },
];
