import ListingView from "@/components/listing/ListingView";
import ListingHero from "@/components/listing/ListingHero";
import { listingMetadata } from "@/components/listing/seo";

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const q = typeof sp?.q === "string" ? sp.q.trim() : "";
  return listingMetadata({
    searchParams: sp,
    basePath: "/watches",
    title: q ? `Search: ${q}` : "All Watches — Analog, Digital & Smart Watches Online",
    description:
      "Shop stylish watches for men and women — analog, digital, analog-digital and smart watches at great prices. Cash on Delivery and easy 7-day returns across India.",
  });
}

export default async function WatchesPage({ searchParams }) {
  const sp = await searchParams;
  const q = typeof sp?.q === "string" ? sp.q.trim().slice(0, 80) : "";
  return (
    <ListingView
      searchParams={sp}
      basePath="/watches"
      listName="All watches"
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Watches", href: "/watches" },
      ]}
      hero={
        <ListingHero
          crumbs={[{ label: "Home", href: "/" }, { label: "Watches" }]}
          title={q ? `Results for “${q}”` : "All Watches"}
          intro={q ? null : "Analog, digital and smart watches for men and women. Cash on Delivery across India."}
        />
      }
    />
  );
}
