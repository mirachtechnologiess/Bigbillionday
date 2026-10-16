import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import ListingHero from "@/components/listing/ListingHero";
import { getCollectionsIndex } from "@/lib/storefront-data";

export const metadata = {
  title: "Watch Collections — Handpicked Edits",
  description: "Curated watch collections — gift edits, divers, dress watches, skeletons and more. Cash on Delivery across India.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage() {
  let collections = [];
  try {
    collections = await getCollectionsIndex();
  } catch (e) {
    console.error("[collections]", e);
  }
  return (
    <div className="bg-ink-2 pb-6">
      <ListingHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Collections" }]}
        title="Collections"
        intro="Handpicked edits to help you choose faster."
      />
      <section className="container-lux pt-4" aria-label="Collections">
        {collections.length === 0 ? (
          <p className="rounded-xl bg-white py-16 text-center text-bone-2">New collections are coming soon.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
            {collections.map((c, i) => (
              <li key={c.slug}>
                <Link href={`/collections/${c.slug}`} className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white transition-shadow hover:shadow-md">
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#f6f7f9]">
                    {c.cover && (
                      <Image
                        src={c.cover}
                        alt={c.name}
                        fill
                        sizes="(min-width:1024px) 24vw, (min-width:768px) 32vw, 50vw"
                        priority={i < 2}
                        placeholder={c.coverBlur ? "blur" : "empty"}
                        blurDataURL={c.coverBlur || undefined}
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 items-start justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <h2 className="line-clamp-1 text-[15px] font-bold text-bone group-hover:text-gold-2">{c.name}</h2>
                      <p className="text-[12.5px] text-mute">{c._count.products} products</p>
                      {c.description && <p className="mt-1 hidden text-[12.5px] text-bone-2 sm:line-clamp-2">{c.description}</p>}
                    </div>
                    <ChevronRight size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
