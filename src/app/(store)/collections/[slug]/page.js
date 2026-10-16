import { notFound } from "next/navigation";
import ListingView from "@/components/listing/ListingView";
import ListingHero from "@/components/listing/ListingHero";
import { listingMetadata } from "@/components/listing/seo";
import { getCollectionBySlug } from "@/lib/storefront-data";

async function load(slug) {
  try {
    return await getCollectionBySlug(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  const col = await load(slug);
  if (!col) return { title: "Collection not found", robots: { index: false } };
  return listingMetadata({
    searchParams: await searchParams,
    basePath: `/collections/${slug}`,
    fixed: { collection: slug },
    title: `${col.name} — Watch Collection`,
    description: col.description || `Shop the ${col.name} collection — handpicked watches at great prices. Cash on Delivery across India.`,
    image: col.image || undefined,
  });
}

export default async function CollectionPage({ params, searchParams }) {
  const { slug } = await params;
  const col = await load(slug);
  if (!col) notFound();
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Collections", href: "/collections" },
    { label: col.name, href: `/collections/${slug}` },
  ];
  return (
    <ListingView
      searchParams={await searchParams}
      basePath={`/collections/${slug}`}
      fixed={{ collection: slug }}
      listName={col.name}
      crumbs={crumbs}
      hero={
        <ListingHero
          crumbs={crumbs}
          title={col.name}
          intro={col.description || `${col._count.products} products`}
        />
      }
    />
  );
}
