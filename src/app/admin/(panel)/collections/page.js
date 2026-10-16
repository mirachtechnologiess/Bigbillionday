import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-api";
import CollectionsList from "@/components/admin/collections/CollectionsList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Collections" };

export default async function CollectionsPage() {
  await requireAdminPage();
  const rows = await db.collection.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { products: true } },
      products: { take: 4, orderBy: { position: "asc" }, select: { product: { select: { images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } } } } },
    },
  });
  const collections = rows.map(({ _count, products, ...c }) => ({
    ...c,
    productCount: _count.products,
    previews: products.map((p) => p.product.images[0]?.url).filter(Boolean),
  }));
  return <CollectionsList collections={collections} />;
}
