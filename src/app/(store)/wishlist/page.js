import { getSession } from "@/lib/auth";
import PageIntro from "@/components/commerce/PageIntro";
import WishlistView from "@/components/account/WishlistView";

export const metadata = {
  title: "Wishlist",
  robots: { index: false, follow: true },
  alternates: { canonical: "/wishlist" },
};

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const session = await getSession();
  return (
    <div className="container-lux pb-16 pt-5 sm:pt-8">
      <PageIntro title="My Wishlist" />
      <WishlistView signedIn={Boolean(session?.sub)} />
    </div>
  );
}
