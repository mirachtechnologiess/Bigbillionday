/** URL helpers for the home page. Keep in sync with the product route used by ProductCard. */
export const productHref = (slug) => `/watches/${slug}`;
export const brandHref = (slug) => `/brands/${slug}`;
export const categoryHref = (slug) => `/category/${slug}`;
export const collectionHref = (slug) => `/collections/${slug}`;

export const firstImage = (p) => (p?.images && p.images[0]) || null;
