import { getHomeData } from "@/lib/catalog";
import { buildBannerSlides, getHomeBanners, getHomeMerch } from "@/lib/home-data";
import { getSettings } from "@/lib/settings";
import { discountPct, formatINR, siteUrl } from "@/lib/utils";
import JsonLd from "@/components/seo/JsonLd";
import ProductGrid, { ProductRail } from "@/components/product/ProductGrid";
import Hero from "@/components/home/Hero";
import DealBanner from "@/components/home/DealBanner";
import CategoryCircles from "@/components/home/CategoryCircles";
import QuadCards from "@/components/home/QuadCards";
import Countdown from "@/components/home/Countdown";
import PriceBands from "@/components/home/PriceBands";
import BrandStrip from "@/components/home/BrandStrip";
import TrustStrip from "@/components/home/TrustStrip";
import SectionHead from "@/components/home/SectionHead";
import FadeIn from "@/components/home/FadeIn";
import { brandHref, categoryHref, firstImage, productHref } from "@/components/home/links";

export async function generateMetadata() {
  const { seo } = await getSettings();
  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: { canonical: "/" },
  };
}

const EMPTY = { featured: [], newArrivals: [], bestSellers: [], brands: [], categories: [], collections: [], heroProducts: [] };
const EMPTY_MERCH = {
  deals: [],
  maxDiscount: 0,
  cheapest: [],
  smart: [],
  accessories: [],
  categoryTiles: [],
  brandTiles: [],
  priceBands: [],
  genderImages: {},
  newCount: 0,
  topBrand: null,
};

async function safe(fn, fallback, label) {
  try {
    return await fn();
  } catch (e) {
    console.error(`[home] ${label} failed`, e);
    return fallback;
  }
}

/** Unique products across lists (first occurrence wins). */
function uniq(...lists) {
  const seen = new Set();
  return lists.flat().filter((p) => p && !seen.has(p.id) && seen.add(p.id));
}

const thumb = (p, chip) => ({
  href: productHref(p.slug),
  image: firstImage(p),
  label: p.brand?.name ? `${p.brand.name} · ${formatINR(p.price)}` : formatINR(p.price),
  chip,
});

// Plain wrapper (not a landmark) — ProductRail already renders its own labelled <section>.
const Section = ({ children, tone = "bg-white", className = "" }) => (
  <div className={`${tone} py-5 sm:py-7 ${className}`}>
    <FadeIn className="container-lux">{children}</FadeIn>
  </div>
);

export default async function HomePage() {
  const [data, merch, banners, settings] = await Promise.all([
    safe(getHomeData, EMPTY, "getHomeData"),
    safe(getHomeMerch, EMPTY_MERCH, "getHomeMerch"),
    safe(() => getHomeBanners("home_hero"), [], "getHomeBanners"),
    getSettings(),
  ]);
  const { featured, newArrivals, bestSellers } = data;
  const { home, store, shipping } = settings;

  const slides = buildBannerSlides(banners, merch);
  const deals = merch.deals;
  const under999 = merch.priceBands.find((b) => b.min == null && b.max === 999);

  // Category circles: quick links first, then every real category — each with a real product photo.
  const circles = [
    deals.length && { label: "Deals", href: "/watches?sale=1&sort=price-asc", image: firstImage(deals[0]), badge: merch.maxDiscount ? `${merch.maxDiscount}% off` : null },
    under999 && { label: "Under ₹999", href: "/watches?max=999", image: firstImage(merch.cheapest[0]) },
    newArrivals.length && { label: "New Arrivals", href: "/new-arrivals", image: firstImage(newArrivals[0]), badge: "New" },
    merch.genderImages.MEN && { label: "Men", href: "/men", image: merch.genderImages.MEN },
    merch.genderImages.WOMEN && { label: "Women", href: "/women", image: merch.genderImages.WOMEN },
    ...merch.categoryTiles.map((c) => ({ label: c.name, href: categoryHref(c.slug), image: c.image })),
  ].filter(Boolean);

  const quad = [
    {
      title: "Top deals for you",
      href: "/watches?sale=1&sort=price-asc",
      items: deals.slice(0, 4).map((p) => ({ ...thumb(p, `${discountPct(p.price, p.mrp)}% off`), chipTone: "ember" })),
    },
    { title: "Bestsellers", href: "/watches?sort=popular", items: bestSellers.slice(0, 4).map((p) => thumb(p)) },
    { title: "New arrivals", href: "/new-arrivals", items: newArrivals.slice(0, 4).map((p) => thumb(p, "New")) },
    {
      title: "Shop by brand",
      href: "/brands",
      cta: "See all brands",
      items: merch.brandTiles.slice(0, 4).map((b) => ({ href: brandHref(b.slug), image: b.image, label: `${b.name} (${b.count})` })),
    },
  ];

  // Deal of the day: biggest discounts first, skipping ones already used in the quad card.
  const dealRail = deals.length > 8 ? uniq(deals.slice(4), deals.slice(0, 4)) : deals;
  const gridNew = uniq(newArrivals, featured).slice(0, 12);

  const listed = featured.length ? featured : bestSellers.slice(0, 8);
  const itemList = listed.length
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Featured watches",
        itemListElement: listed.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: siteUrl(productHref(p.slug)),
          item: {
            "@type": "Product",
            name: p.name,
            url: siteUrl(productHref(p.slug)),
            image: p.images?.[0]?.url ? (p.images[0].url.startsWith("http") ? p.images[0].url : siteUrl(p.images[0].url)) : undefined,
            brand: p.brand?.name ? { "@type": "Brand", name: p.brand.name } : undefined,
            offers: {
              "@type": "Offer",
              price: p.price,
              priceCurrency: "INR",
              availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            },
          },
        })),
      }
    : null;

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: store.name,
            url: siteUrl(),
            logo: siteUrl("/logo.png"),
            sameAs: [store.instagram, store.facebook, store.youtube].filter(Boolean),
          },
          ...(itemList ? [itemList] : []),
        ]}
      />

      <Hero title={home.heroTitle} subtitle={home.heroSubtitle} storeName={store.name} />

      <DealBanner slides={slides} />

      <CategoryCircles items={circles} />

      <QuadCards cards={quad} />

      {dealRail.length ? (
        <Section>
          <SectionHead title="Deal of the Day" href="/watches?sale=1&sort=price-asc" cta="See all deals">
            <Countdown />
          </SectionHead>
          <ProductRail products={dealRail} />
        </Section>
      ) : null}

      {merch.priceBands.length ? (
        <Section tone="bg-ink-2">
          <SectionHead title="Shop by price" href="/watches?sort=price-asc" cta="All prices" />
          <PriceBands bands={merch.priceBands} />
        </Section>
      ) : null}

      {bestSellers.length ? (
        <Section>
          <ProductRail products={bestSellers} title="Bestsellers" href="/watches?sort=popular" />
        </Section>
      ) : null}

      {gridNew.length ? (
        <Section tone="bg-ink-2">
          <SectionHead title="New arrivals" href="/new-arrivals" />
          <ProductGrid products={gridNew} cols={6} />
        </Section>
      ) : null}

      {merch.brandTiles.length ? (
        <Section>
          <SectionHead title="Top brands" href="/brands" cta="All brands" />
          <BrandStrip brands={merch.brandTiles.slice(0, 12)} />
        </Section>
      ) : null}

      {merch.smart.length ? (
        <Section tone="bg-ink-2">
          <ProductRail products={merch.smart} title="Smart watches" href={categoryHref("smart-watches")} />
        </Section>
      ) : null}

      {merch.accessories.length ? (
        <Section>
          <ProductRail products={merch.accessories} title="Accessories" href={categoryHref("accessories")} />
        </Section>
      ) : null}

      <TrustStrip freeShippingAbove={shipping?.freeShippingAbove} />
    </>
  );
}
