/** Category row under the header search (desktop text links, mobile chips) + drawer. */
export const CATEGORY_NAV = [
  { label: "All Watches", href: "/watches" },
  { label: "Men", href: "/men" },
  { label: "Women", href: "/women" },
  { label: "Smart Watches", href: "/category/smart-watches" },
  { label: "Analog", href: "/category/analog-watches" },
  { label: "Digital", href: "/category/digital-watches" },
  { label: "Analog-Digital", href: "/category/analog-digital-watches" },
  { label: "Brands", href: "/brands" },
  { label: "New Arrivals", href: "/new-arrivals" },
  { label: "Under ₹999", href: "/watches?max=999", tone: "lume" },
  { label: "Deals", href: "/watches?sale=1&sort=price-asc", tone: "ember" },
  { label: "Accessories", href: "/category/accessories" },
];

/** Kept for backwards compatibility (footer / older imports). */
export const NAV = [
  { label: "Watches", href: "/watches" },
  { label: "Men", href: "/men" },
  { label: "Women", href: "/women" },
  { label: "Brands", href: "/brands" },
  { label: "Collections", href: "/collections" },
  { label: "New Arrivals", href: "/new-arrivals" },
];

export const PRICE_LINKS = [
  { label: "Under ₹999", href: "/watches?max=999" },
  { label: "₹1,000 – ₹1,499", href: "/watches?min=1000&max=1499" },
  { label: "₹1,500 – ₹1,999", href: "/watches?min=1500&max=1999" },
  { label: "₹2,000 & above", href: "/watches?min=2000" },
];

export const HELP_LINKS = [
  { label: "Track your order", href: "/track-order" },
  { label: "Shipping policy", href: "/shipping-policy" },
  { label: "Returns & refunds", href: "/return-policy" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact us", href: "/contact" },
];

/** Is a nav href active for the current path + query? */
export function isActive(href, pathname, search = "") {
  const [path, query] = href.split("?");
  if (query) return pathname === path && search.replace(/^\?/, "") === query;
  if (path === "/watches") return pathname === "/watches" && !search;
  return pathname === path || pathname?.startsWith(path + "/");
}

/** Legacy mega-menu groups (unused by the current header). */
export const MEGA = [{ title: "Price", links: PRICE_LINKS }];
