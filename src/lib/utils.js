import clsx from "clsx";

export const cn = (...args) => clsx(...args);

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const formatINR = (n) => inr.format(Number(n) || 0);

// Floored and capped at 99 so huge MRPs never render as a nonsensical "100% off".
export const discountPct = (price, mrp) => (mrp > price && price > 0 ? Math.min(99, Math.floor(((mrp - price) / mrp) * 100)) : 0);

export function slugify(str = "") {
  return String(str)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export const siteUrl = (path = "") =>
  `${(process.env.NEXT_PUBLIC_SITE_URL || "https://bigbillionday.store").replace(/\/$/, "")}${path}`;

export function generateOrderNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `BBD${ymd}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export const ORDER_STATUS_LABEL = {
  PENDING: "Order placed",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURN_REQUESTED: "Return requested",
  RETURNED: "Returned",
};

export const ORDER_FLOW = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

export const GENDER_LABEL = { MEN: "Men", WOMEN: "Women", UNISEX: "Unisex", KIDS: "Kids" };

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
];

/** Filterable watch attributes used by listing filters + admin forms. */
export const WATCH_ATTRS = {
  movement: ["Automatic", "Quartz", "Mechanical (Hand-wound)", "Solar", "Kinetic", "Smart", "Chronograph Quartz"],
  display: ["Analog", "Digital", "Analog-Digital", "Smart"],
  caseMaterial: ["Stainless Steel", "Titanium", "Gold PVD", "Rose Gold PVD", "Ceramic", "Brass", "Resin", "Carbon", "Aluminium"],
  caseShape: ["Round", "Square", "Rectangle", "Tonneau", "Octagon", "Cushion"],
  strapMaterial: ["Stainless Steel", "Leather", "Silicone", "Rubber", "Nylon", "Mesh", "Ceramic", "Titanium"],
  glass: ["Sapphire", "Mineral", "Hardlex", "Acrylic", "Gorilla Glass"],
  waterResistance: ["30m", "50m", "100m", "200m", "300m+"],
  dialColor: ["Black", "Blue", "White", "Silver", "Green", "Grey", "Gold", "Rose Gold", "Brown", "Red", "Champagne", "Skeleton", "Mother of Pearl"],
};
