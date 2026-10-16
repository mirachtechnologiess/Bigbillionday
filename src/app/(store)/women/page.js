import ListingView from "@/components/listing/ListingView";
import ListingHero from "@/components/listing/ListingHero";
import { listingMetadata } from "@/components/listing/seo";

const FIXED = { gender: "women" };

export async function generateMetadata({ searchParams }) {
  return listingMetadata({
    searchParams: await searchParams,
    basePath: "/women",
    fixed: FIXED,
    title: "Women's Watches — Elegant, Luxury & Designer Watches for Women",
    description: "Shop stylish women's watches — elegant dress watches, rose gold, mother-of-pearl and automatic pieces from top brands. Cash on Delivery across India.",
  });
}

export default async function WomenPage({ searchParams }) {
  return (
    <ListingView
      searchParams={await searchParams}
      basePath="/women"
      fixed={FIXED}
      listName="Women's watches"
      crumbs={[
        { label: "Home", href: "/" },
        { label: "Women", href: "/women" },
      ]}
      hero={
        <ListingHero
          crumbs={[{ label: "Home", href: "/" }, { label: "Women" }]}
          title="Women's Watches"
          intro="Elegant analog, rose-gold and smart watches for women. Cash on Delivery across India."
        />
      }
    />
  );
}
