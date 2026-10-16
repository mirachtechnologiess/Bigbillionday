import { MULTI_KEYS, buildHref, cleanParams, splitList } from "./params";

/**
 * Metadata for listing pages. Single-value, single-filter views are indexable with a self canonical;
 * searches and multi-filter combinations are noindex,follow and canonicalise to the base path.
 */
export function listingMetadata({ searchParams, basePath, fixed = {}, title, description, image }) {
  const params = cleanParams(searchParams);
  for (const k of Object.keys(fixed)) delete params[k];
  const page = Math.max(1, Number(params.page) || 1);
  const filterKeys = Object.keys(params).filter((k) => k !== "page" && k !== "sort");
  const multiValue = filterKeys.some((k) => MULTI_KEYS.includes(k) && splitList(params[k]).length > 1);
  const heavy = filterKeys.length > 1 || multiValue || !!params.q || (params.sort && filterKeys.length > 0);
  const priceOnly = filterKeys.every((k) => k === "min" || k === "max") && filterKeys.length > 0;

  const canonicalParams = {};
  if (!heavy && !priceOnly && filterKeys.length === 1) canonicalParams[filterKeys[0]] = params[filterKeys[0]];
  if (page > 1 && !heavy) canonicalParams.page = page;
  const canonical = buildHref(basePath, canonicalParams);
  const fullTitle = page > 1 ? `${title} — Page ${page}` : title;

  return {
    title: fullTitle,
    description,
    alternates: { canonical },
    robots: heavy || priceOnly ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      type: "website",
      ...(image && { images: [{ url: image }] }),
    },
  };
}
