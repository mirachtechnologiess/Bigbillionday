import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Star } from "lucide-react";
import { getProductBySlug, getRelated } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { GENDER_LABEL, siteUrl } from "@/lib/utils";
import JsonLd from "@/components/seo/JsonLd";
import Gallery from "@/components/product/Gallery";
import BuyPanel from "@/components/product/BuyPanel";
import ReviewForm from "@/components/product/ReviewForm";
import RecentlyViewed from "@/components/product/RecentlyViewed";
import { ProductRail } from "@/components/product/ProductGrid";
import { Breadcrumbs } from "@/components/listing/ListingHero";
import { sanitizeHtml, stripTags } from "@/components/product/sanitize";

async function load(slug) {
  try {
    return await getProductBySlug(slug);
  } catch (e) {
    console.error("[pdp]", e);
    return null;
  }
}

const abs = (u) => (!u ? undefined : /^https?:\/\//.test(u) ? u : siteUrl(u.startsWith("/") ? u : `/${u}`));

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) return { title: "Watch not found", robots: { index: false } };
  const title = p.seoTitle || `${p.brand.name} ${p.name}${p.modelNumber ? ` (${p.modelNumber})` : ""}`;
  const description =
    p.seoDesc ||
    p.shortDescription ||
    stripTags(p.description).slice(0, 155) ||
    `Buy the ${p.brand.name} ${p.name} online in India at the best price. Cash on Delivery and easy 7-day returns.`;
  const img = p.images[0];
  return {
    title,
    description,
    alternates: { canonical: `/watches/${p.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/watches/${p.slug}`,
      images: img ? [{ url: abs(img.url), width: img.width || 1200, height: img.height || 1500, alt: img.alt || p.name }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: img ? [abs(img.url)] : undefined },
    other: {
      "product:price:amount": String(p.price),
      "product:price:currency": "INR",
      "product:availability": p.stock > 0 ? "in stock" : "out of stock",
      "product:brand": p.brand.name,
    },
  };
}

function SpecRow({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <div className="grid grid-cols-[minmax(110px,38%)_1fr] gap-3 px-3 py-2.5 text-[13.5px] odd:bg-ink-2 sm:px-4">
      <dt className="text-mute">{label}</dt>
      <dd className="font-medium text-bone">{value}</dd>
    </div>
  );
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await load(slug);
  if (!product) notFound();

  const [settings, related] = await Promise.all([getSettings(), getRelated(product, 12).catch(() => [])]);
  const { store, shipping, payment } = settings;
  const p = product;
  const url = siteUrl(`/watches/${p.slug}`);

  const specsObj = p.specs && typeof p.specs === "object" && !Array.isArray(p.specs) ? p.specs : {};
  const offerText = typeof specsObj.offer === "string" ? specsObj.offer.trim() : "";

  // shapes passed to client components (serialisable)
  const card = {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    mrp: p.mrp,
    stock: p.stock,
    gender: p.gender,
    isNewArrival: p.isNewArrival,
    isBestSeller: p.isBestSeller,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    movement: p.movement,
    caseSize: p.caseSize,
    brand: { name: p.brand.name, slug: p.brand.slug },
    images: p.images.slice(0, 2).map((i) => ({ url: i.url, alt: i.alt, blurData: i.blurData })),
  };
  const buy = {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: { name: p.brand.name, slug: p.brand.slug },
    price: p.price,
    mrp: p.mrp,
    stock: p.stock,
    lowStockAt: p.lowStockAt,
    codAvailable: p.codAvailable,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    modelNumber: p.modelNumber,
    shortDescription: p.shortDescription,
    image: p.images[0]?.url || null,
    offer: offerText || null,
  };
  const images = p.images.map((i) => ({ url: i.url, alt: i.alt, blurData: i.blurData }));

  const extraSpecs =
    p.specs && typeof p.specs === "object" && !Array.isArray(p.specs)
      ? Object.entries(p.specs).filter(([k, v]) => k !== "offer" && v != null && v !== "" && typeof v !== "object")
      : [];
  const specs = [
    ["Brand", p.brand.name],
    ["Model no.", p.modelNumber],
    ["For", GENDER_LABEL[p.gender]],
    ["Movement", p.movement],
    ["Display", p.display],
    ["Case material", p.caseMaterial],
    ["Case size", p.caseSize ? `${p.caseSize} mm` : null],
    ["Case shape", p.caseShape],
    ["Dial colour", p.dialColor],
    ["Strap", [p.strapMaterial, p.strapColor].filter(Boolean).join(" · ")],
    ["Crystal", p.glass],
    ["Water resistance", p.waterResistance],
    ["Weight", p.weightGrams ? `${p.weightGrams} g` : null],
    ["Features", p.features?.length ? p.features.join(", ") : null],
    ["Warranty", p.warranty],
    ...extraSpecs.map(([k, v]) => [k.replace(/([a-z])([A-Z])/g, "$1 $2"), String(v)]),
    ["SKU", p.sku],
  ];
  const descriptionHtml = sanitizeHtml(p.description);

  // rating distribution from the approved reviews we have
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: p.reviews.filter((r) => r.rating === s).length }));
  const distTotal = p.reviews.length || 1;

  // ── JSON-LD ──
  const [etaMin, etaMax] = String(shipping.etaDays || "3-7")
    .split("-")
    .map((n) => parseInt(n, 10) || 0);
  const validUntil = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: `${p.brand.name} ${p.name}`,
    url,
    image: p.images.map((i) => abs(i.url)),
    description: p.shortDescription || stripTags(p.description).slice(0, 500) || undefined,
    sku: p.sku,
    mpn: p.modelNumber || undefined,
    brand: { "@type": "Brand", name: p.brand.name },
    category: p.category?.name || "Watches",
    color: p.dialColor || undefined,
    material: p.caseMaterial || undefined,
    ...(p.weightGrams && { weight: { "@type": "QuantitativeValue", value: p.weightGrams, unitCode: "GRM" } }),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      price: p.price,
      priceValidUntil: validUntil,
      itemCondition: "https://schema.org/NewCondition",
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: store.name, url: siteUrl() },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: shipping.freeShippingAbove && p.price >= shipping.freeShippingAbove ? 0 : Number(shipping.flatFee) || 0,
          currency: "INR",
        },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: etaMin || 3, maxValue: etaMax || etaMin || 7, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 7,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
    },
  };
  if (p.ratingCount > 0) {
    productLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(p.ratingAvg.toFixed(1)),
      reviewCount: p.ratingCount,
      bestRating: 5,
      worstRating: 1,
    };
    productLd.review = p.reviews.slice(0, 5).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.name },
      datePublished: r.createdAt.toISOString().slice(0, 10),
      name: r.title || undefined,
      reviewBody: r.body,
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
    }));
  }
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Watches", href: "/watches" },
    { name: p.brand.name, href: `/brands/${p.brand.slug}` },
    { name: p.name, href: `/watches/${p.slug}` },
  ];
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: siteUrl(c.href) })),
  };

  const uiCrumbs = [
    { label: "Home", href: "/" },
    ...(p.category ? [{ label: p.category.name, href: p.category.slug ? `/category/${p.category.slug}` : "/watches" }] : [{ label: "Watches", href: "/watches" }]),
    { label: p.brand.name, href: `/brands/${p.brand.slug}` },
    { label: p.name },
  ];

  return (
    <>
      <JsonLd data={[productLd, breadcrumbLd]} />

      <div className="container-lux pt-3 sm:pt-4">
        <Breadcrumbs crumbs={uiCrumbs} className="hidden sm:block" />

        <section className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
          <div className="lg:sticky lg:top-[calc(var(--header-h)+16px)] lg:self-start">
            <Gallery
              images={images}
              alt={`${p.brand.name} ${p.name}`}
              badge={
                p.isNewArrival || p.isBestSeller ? (
                  <span className={p.isBestSeller ? "rounded bg-sun px-2 py-1 text-[11px] font-bold text-bone" : "rounded bg-teal px-2 py-1 text-[11px] font-bold text-white"}>
                    {p.isBestSeller ? "Bestseller" : "New arrival"}
                  </span>
                ) : null
              }
            />
          </div>
          <div>
            <BuyPanel product={buy} shipping={shipping} codEnabled={payment.codEnabled} />

            {p.highlights?.length > 0 && (
              <section className="mt-6" aria-labelledby="highlights-title">
                <h2 id="highlights-title" className="text-[16px] font-bold text-bone">
                  Highlights
                </h2>
                <ul className="mt-2 space-y-1.5">
                  {p.highlights.slice(0, 8).map((h, i) => (
                    <li key={i} className="flex gap-2 text-[14px] leading-relaxed text-bone-2">
                      <Check size={16} strokeWidth={2.5} className="mt-[3px] shrink-0 text-lume" aria-hidden />
                      {h}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </section>
      </div>

      <section className="container-lux mt-8 grid gap-8 lg:mt-10 lg:grid-cols-2 lg:gap-10">
        <div>
          <h2 className="text-[18px] font-bold text-bone sm:text-[20px]">Specifications</h2>
          <dl className="mt-3 overflow-hidden rounded-xl border border-line">
            {specs
              .filter(([, v]) => v != null && v !== "")
              .map(([l, v]) => (
                <SpecRow key={l} label={l} value={v} />
              ))}
          </dl>
        </div>
        <div>
          <h2 className="text-[18px] font-bold text-bone sm:text-[20px]">Product description</h2>
          {descriptionHtml ? (
            <div className="prose-lux mt-3" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
          ) : (
            <p className="prose-lux mt-3">{p.shortDescription || "Full details coming soon."}</p>
          )}
          {p.tags?.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {p.tags.slice(0, 10).map((t) => (
                <li key={t}>
                  <Link href={`/watches?q=${encodeURIComponent(t)}`} className="chip hover:border-gold hover:text-gold-2">
                    {t}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section id="reviews" className="container-lux mt-10 scroll-mt-[calc(var(--header-h)+16px)]" aria-labelledby="reviews-title">
        <div className="rounded-xl border border-line bg-white p-4 sm:p-6">
          <h2 id="reviews-title" className="text-[18px] font-bold text-bone sm:text-[20px]">
            Ratings &amp; reviews
          </h2>
          <div className="mt-4 grid gap-8 lg:grid-cols-[320px_1fr] lg:gap-12">
            <div>
              {p.ratingCount > 0 ? (
                <div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 rounded-md bg-lume px-2.5 py-1 text-[24px] font-extrabold leading-none text-white">
                      {p.ratingAvg.toFixed(1)}
                      <Star size={18} className="fill-current" aria-hidden />
                    </span>
                    <p className="text-[13px] text-mute">
                      {p.ratingCount} rating{p.ratingCount > 1 ? "s" : ""}
                    </p>
                  </div>
                  <ul className="mt-4 space-y-1.5">
                    {dist.map(({ s, n }) => (
                      <li key={s} className="flex items-center gap-2.5 text-[12.5px] text-bone-2">
                        <span className="flex w-7 items-center gap-0.5">
                          {s} <Star size={11} className="fill-current text-mute" aria-hidden />
                        </span>
                        <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-ink-3">
                          <span
                            className={`absolute inset-y-0 left-0 rounded-full ${s >= 3 ? "bg-lume" : s === 2 ? "bg-sun" : "bg-ember"}`}
                            style={{ width: `${(n / distTotal) * 100}%` }}
                          />
                        </span>
                        <span className="w-6 text-right text-mute">{n}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-[14px] text-bone-2">No reviews yet. Bought this watch? Share your experience.</p>
              )}
              <div className="mt-5">
                <ReviewForm productId={p.id} />
              </div>
            </div>

            <ul className="divide-y divide-line self-start">
              {p.reviews.length === 0 && <li className="py-6 text-[14px] text-mute">Be the first to write a review.</li>}
              {p.reviews.map((r) => (
                <li key={r.id} className="py-4 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-0.5 rounded bg-lume px-1.5 py-0.5 text-[11.5px] font-bold text-white">
                      {r.rating} <Star size={10} className="fill-current" aria-hidden />
                    </span>
                    {r.title && <p className="text-[14.5px] font-bold text-bone">{r.title}</p>}
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-bone-2">{r.body}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[12px] text-mute">
                    <span className="font-semibold text-bone-2">{r.name}</span>
                    {r.verified && <span className="font-semibold text-lume">Verified buyer</span>}
                    <time dateTime={r.createdAt.toISOString()}>
                      {r.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </time>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <div className="container-lux mt-8">
          <div className="rounded-xl border border-line bg-white p-3 sm:p-5">
            <ProductRail products={related} title="Similar products" href={`/brands/${p.brand.slug}`} hrefLabel={`More from ${p.brand.name}`} />
          </div>
        </div>
      )}

      <RecentlyViewed current={card} />
      {/* room for the mobile sticky buy bar */}
      <div aria-hidden className="h-16 lg:hidden" />
    </>
  );
}
