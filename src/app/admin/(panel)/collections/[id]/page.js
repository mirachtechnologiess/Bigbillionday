import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-api";
import CollectionEditor from "@/components/admin/collections/CollectionEditor";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: id === "new" ? "New collection" : "Edit collection" };
}

export default async function CollectionEditPage({ params }) {
  const user = await requireAdminPage();
  const { id } = await params;
  if (id === "new") return <CollectionEditor collection={null} canDelete={user.role === "ADMIN"} />;

  const c = await db.collection.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { position: "asc" },
        select: {
          product: {
            select: { id: true, name: true, sku: true, price: true, status: true, brand: { select: { name: true } }, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } },
          },
        },
      },
    },
  });
  if (!c) notFound();
  const { products, ...rest } = c;
  const collection = {
    ...rest,
    products: products.map(({ product: p }) => ({ id: p.id, name: p.name, sku: p.sku, price: p.price, status: p.status, brand: p.brand?.name || null, image: p.images[0]?.url || null })),
  };
  return <CollectionEditor collection={collection} canDelete={user.role === "ADMIN"} />;
}
