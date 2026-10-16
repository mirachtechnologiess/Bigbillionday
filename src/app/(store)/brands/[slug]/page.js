import Image from "next/image";
import { notFound } from "next/navigation";
import ListingView from "@/components/listing/ListingView";
import ListingHero from "@/components/listing/ListingHero";
import { listingMetadata } from "@/components/listing/seo";
import { getBrandBySlug } from "@/lib/storefront-data";

async function load(slug) {
  try {
    return await getBrandBySlug(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  const brand = await load(slug);
  if (!brand) return { title: "Brand not found", robots: { index: false } };
  return listingMetadata({
    searchParams: await searchParams,
    basePath: `/brands/${slug}`,
    fixed: { brand: slug },
    title: brand.seoTitle || `${brand.name} Watches — Buy Online with Cash on Delivery`,
    description:
      brand.seoDesc ||
      `Shop ${brand.name} watches for men and women — ${brand._count.products} styles in stock. Great prices in India with Cash on Delivery and easy returns.`,
    image: brand.logo || undefined,
  });
}

export default async function BrandPage({ params, searchParams }) {
  const { slug } = await params;
  const brand = await load(slug);
  if (!brand) notFound();
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Brands", href: "/brands" },
    { label: brand.name, href: `/brands/${slug}` },
  ];
  return (
    <ListingView
      searchParams={await searchParams}
      basePath={`/brands/${slug}`}
      fixed={{ brand: slug }}
      listName={`${brand.name} watches`}
      crumbs={crumbs}
      hero={
        <ListingHero
          crumbs={crumbs}
          title={`${brand.name} Watches`}
          intro={brand.description || `${brand._count.products} products`}
          aside={
            brand.logo ? (
              <div className="hidden h-14 w-28 place-items-center rounded-lg border border-line bg-white px-3 md:grid">
                <span className="relative h-9 w-20">
                  <Image src={brand.logo} alt={`${brand.name} logo`} fill sizes="96px" className="object-contain" />
                </span>
              </div>
            ) : null
          }
        />
      }
    />
  );
}
