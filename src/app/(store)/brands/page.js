import Link from "next/link";
import Image from "next/image";
import ListingHero from "@/components/listing/ListingHero";
import JsonLd from "@/components/seo/JsonLd";
import { getBrandIndex } from "@/lib/storefront-data";
import { siteUrl } from "@/lib/utils";

export const metadata = {
  title: "Watch Brands A–Z — Shop Every Brand",
  description: "Explore every watch brand we carry, A to Z. Great prices, Cash on Delivery across India.",
  alternates: { canonical: "/brands" },
};

export default async function BrandsPage() {
  let brands = [];
  try {
    brands = await getBrandIndex();
  } catch (e) {
    console.error("[brands]", e);
  }
  const featured = brands.filter((b) => b.isFeatured).slice(0, 6);
  const groups = brands.reduce((acc, b) => {
    const ch = b.name[0]?.toUpperCase();
    const key = /[A-Z]/.test(ch) ? ch : "#";
    (acc[key] ||= []).push(b);
    return acc;
  }, {});
  const letters = Object.keys(groups).sort((a, b) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)));
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div className="bg-ink-2 pb-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Watch brands",
          itemListElement: brands.map((b, i) => ({ "@type": "ListItem", position: i + 1, url: siteUrl(`/brands/${b.slug}`), name: b.name })),
        }}
      />
      <ListingHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Brands" }]}
        title="Shop by Brand"
        intro={`${brands.length} brands, A to Z. Tap a brand to see all its watches.`}
      />

      {featured.length > 0 && (
        <section className="container-lux pt-4" aria-label="Popular brands">
          <h2 className="text-[16px] font-bold text-bone">Popular brands</h2>
          <ul className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
            {featured.map((b) => (
              <li key={b.slug}>
                <BrandTile brand={b} highlight />
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label="Jump to letter" className="sticky top-[var(--header-h)] z-20 mt-5 border-y border-line bg-white">
        <ul className="container-lux flex gap-0.5 overflow-x-auto py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {alphabet.map((l) => (
            <li key={l} className="shrink-0">
              {groups[l] ? (
                <a href={`#letter-${l}`} className="grid h-8 w-8 place-items-center rounded-md text-[13px] font-bold text-bone hover:bg-gold hover:text-white">
                  {l}
                </a>
              ) : (
                <span className="grid h-8 w-8 place-items-center text-[13px] text-ink-4">{l}</span>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <section className="container-lux pt-4" aria-label="All brands">
        {letters.length === 0 && <p className="rounded-xl bg-white py-16 text-center text-bone-2">Brands will appear here soon.</p>}
        {letters.map((l) => (
          <div key={l} id={`letter-${l}`} className="scroll-mt-[calc(var(--header-h)+56px)] py-3">
            <h2 className="text-[18px] font-extrabold text-gold">{l}</h2>
            <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
              {groups[l].map((b) => (
                <li key={b.slug}>
                  <BrandTile brand={b} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

function BrandTile({ brand: b, highlight = false }) {
  return (
    <Link
      href={`/brands/${b.slug}`}
      className={`group flex h-full flex-col items-center justify-center gap-1.5 rounded-xl border bg-white px-2 py-4 text-center transition-[box-shadow,border-color] hover:border-gold hover:shadow-md ${highlight ? "border-gold/30" : "border-line"}`}
    >
      {b.logo ? (
        <span className="relative h-9 w-24">
          <Image src={b.logo} alt={`${b.name} logo`} fill sizes="96px" className="object-contain" />
        </span>
      ) : (
        <span className="line-clamp-1 text-[15px] font-extrabold tracking-tight text-bone group-hover:text-gold-2">{b.name}</span>
      )}
      <span className="text-[12px] text-mute">
        {b._count.products} {b._count.products === 1 ? "product" : "products"}
      </span>
    </Link>
  );
}
