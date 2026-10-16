import { searchProducts, getFacets } from "@/lib/catalog";
import { siteUrl } from "@/lib/utils";
import ProductGrid from "@/components/product/ProductGrid";
import JsonLd from "@/components/seo/JsonLd";
import ListingShell from "./ListingShell";
import Pagination from "./Pagination";
import EmptyState from "./EmptyState";
import { buildHref, cleanParams } from "./params";

export const PER_PAGE = 24;

/**
 * Shared server listing: hero + filters + grid + pagination.
 * - searchParams: resolved Next searchParams object
 * - fixed: params forced by the route (e.g. { gender: "men" }) — hidden from the URL & filter UI
 * - hide: facet keys to hide in the filter UI
 */
export default async function ListingView({
  searchParams,
  basePath,
  fixed = {},
  hide = [],
  defaultSort = "featured",
  hero,
  crumbs = [],
  listName,
}) {
  const params = cleanParams(searchParams);
  for (const k of Object.keys(fixed)) delete params[k];
  const query = { ...params, ...fixed, sort: params.sort || defaultSort };

  let result = { items: [], total: 0, page: 1, pages: 1 };
  let facets = {};
  try {
    [result, facets] = await Promise.all([
      searchProducts(query, { perPage: PER_PAGE }),
      getFacets(),
    ]);
  } catch (e) {
    console.error("[listing]", e);
  }
  const { items, total, page, pages } = result;
  const hasFilters = Object.keys(params).some(
    (k) => k !== "sort" && k !== "page",
  );

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: listName,
      numberOfItems: total,
      itemListElement: items.map((p, i) => ({
        "@type": "ListItem",
        position: (page - 1) * PER_PAGE + i + 1,
        url: siteUrl(`/watches/${p.slug}`),
        name: p.name,
      })),
    },
  ];
  if (crumbs.length) {
    ld.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.label,
        item: siteUrl(c.href || basePath),
      })),
    });
  }

  return (
    <>
      <JsonLd data={ld} />
      <div className="bg-ink-2 pb-2">
        {hero}
        <section className="container-lux pt-3 sm:pt-4" aria-label="Results">
          <ListingShell
            basePath={basePath}
            params={params}
            facets={facets}
            total={total}
            hide={[...hide, ...Object.keys(fixed)]}
            defaultSort={defaultSort}
          >
            {items.length ? (
              <>
                <ProductGrid
                  products={items}
                  cols={5}
                  priorityCount={page === 1 ? 4 : 0}
                />
                <Pagination
                  basePath={basePath}
                  params={params}
                  page={page}
                  pages={pages}
                />
              </>
            ) : (
              <EmptyState
                clearHref={hasFilters ? buildHref(basePath, {}) : null}
              />
            )}
          </ListingShell>
        </section>
      </div>
    </>
  );
}
