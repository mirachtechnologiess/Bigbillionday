import Link from "next/link";
import { notFound } from "next/navigation";
import ListingView from "@/components/listing/ListingView";
import ListingHero from "@/components/listing/ListingHero";
import { listingMetadata } from "@/components/listing/seo";
import { getCategoryBySlug } from "@/lib/storefront-data";

async function load(slug) {
  try {
    return await getCategoryBySlug(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  const cat = await load(slug);
  if (!cat) return { title: "Category not found", robots: { index: false } };
  return listingMetadata({
    searchParams: await searchParams,
    basePath: `/category/${slug}`,
    fixed: { category: slug },
    title: cat.seoTitle || `${cat.name} — Shop ${cat.name} Online`,
    description: cat.seoDesc || cat.description || `Shop ${cat.name.toLowerCase()} for men and women at great prices. Cash on Delivery and easy returns across India.`,
    image: cat.image || undefined,
  });
}

export default async function CategoryPage({ params, searchParams }) {
  const { slug } = await params;
  const cat = await load(slug);
  if (!cat) notFound();
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Watches", href: "/watches" },
    ...(cat.parent ? [{ label: cat.parent.name, href: `/category/${cat.parent.slug}` }] : []),
    { label: cat.name, href: `/category/${slug}` },
  ];
  return (
    <ListingView
      searchParams={await searchParams}
      basePath={`/category/${slug}`}
      fixed={{ category: slug }}
      listName={cat.name}
      crumbs={crumbs}
      hero={
        <ListingHero
          crumbs={crumbs}
          title={cat.name}
          intro={cat.description || `${cat._count.products} products`}
          aside={
            cat.children.length > 0 ? (
              <ul className="flex flex-wrap gap-2 md:max-w-md md:justify-end">
                {cat.children.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/category/${c.slug}`} className="chip bg-white font-semibold hover:border-gold hover:text-gold-2">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null
          }
        />
      }
    />
  );
}
