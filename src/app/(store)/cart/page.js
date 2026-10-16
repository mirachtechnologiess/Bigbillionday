import { db } from "@/lib/db";
import { cardSelect } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import ProductCard from "@/components/product/ProductCard";
import PageIntro from "@/components/commerce/PageIntro";
import CartView from "@/components/cart/CartView";

export const metadata = {
  title: "Your Cart",
  robots: { index: false, follow: true },
  alternates: { canonical: "/cart" },
};

async function getRecommended() {
  try {
    return await db.product.findMany({
      where: { status: "ACTIVE", stock: { gt: 0 } },
      orderBy: [{ isBestSeller: "desc" }, { soldCount: "desc" }],
      select: cardSelect,
      take: 4,
    });
  } catch {
    return [];
  }
}

export default async function CartPage() {
  const [settings, recommended] = await Promise.all([getSettings(), getRecommended()]);
  return (
    <div className="container-lux pb-16 pt-5 sm:pt-8">
      <PageIntro title="Shopping Cart" />
      <CartView settings={{ shipping: settings.shipping, payment: settings.payment }} />

      {recommended.length > 0 && (
        <section className="mt-12" aria-labelledby="rec-title">
          <h2 id="rec-title" className="text-lg font-bold text-bone sm:text-xl">
            You may also like
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4">
            {recommended.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
