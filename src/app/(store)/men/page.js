import ListingView from "@/components/listing/ListingView";
import ListingHero from "@/components/listing/ListingHero";
import { listingMetadata } from "@/components/listing/seo";

const FIXED = { gender: "men" };

export async function generateMetadata({ searchParams }) {
  return listingMetadata({
    searchParams: await searchParams,
    basePath: "/men",
    fixed: FIXED,
    title: "Men's Watches — Analog, Digital & Smart Watches for Men",
    description: "Shop stylish men's watches — analog, chronograph-style, digital and smart watches at great prices. Cash on Delivery and easy returns across India.",
  });
}

export default async function MenPage({ searchParams }) {
  return (
    <ListingView
      searchParams={await searchParams}
      basePath="/men"
      fixed={FIXED}
      listName="Men's watches"
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Men", href: "/men" },
      ]}
      hero={
        <ListingHero
          crumbs={[{ label: "Home", href: "/" }, { label: "Men" }]}
          title="Men's Watches"
          intro="Everyday analog, sporty digital and smart watches for men. Cash on Delivery across India."
        />
      }
    />
  );
}
