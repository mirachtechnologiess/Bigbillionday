import ListingView from "@/components/listing/ListingView";
import ListingHero from "@/components/listing/ListingHero";
import { listingMetadata } from "@/components/listing/seo";

const FIXED = { new: "1" };

export async function generateMetadata({ searchParams }) {
  return listingMetadata({
    searchParams: await searchParams,
    basePath: "/new-arrivals",
    fixed: FIXED,
    title: "New Arrivals — Latest Watches Just Landed",
    description: "The newest watches to land at the store — fresh releases and restocks from every brand. Cash on Delivery across India.",
  });
}

export default async function NewArrivalsPage({ searchParams }) {
  return (
    <ListingView
      searchParams={await searchParams}
      basePath="/new-arrivals"
      fixed={FIXED}
      defaultSort="newest"
      listName="New arrivals"
      crumbs={[
        { label: "Home", href: "/" },
        { label: "New arrivals", href: "/new-arrivals" },
      ]}
      hero={
        <ListingHero
          crumbs={[{ label: "Home", href: "/" }, { label: "New arrivals" }]}
          title="New Arrivals"
          intro="The latest watches and restocks, newest first."
        />
      }
    />
  );
}
