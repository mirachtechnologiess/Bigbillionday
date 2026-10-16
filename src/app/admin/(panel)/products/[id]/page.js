import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-api";
import { editorMeta } from "@/lib/admin-editor-meta";
import { getProductForEdit } from "@/lib/admin-products";
import ProductEditor from "@/components/admin/products/ProductEditor";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const p = await getProductForEdit(id).catch(() => null);
  return { title: p ? `Edit · ${p.name}` : "Product" };
}

export default async function EditProductPage({ params }) {
  const user = await requireAdminPage();
  const { id } = await params;
  const [product, { meta, storeName, aiOn }] = await Promise.all([getProductForEdit(id), editorMeta()]);
  if (!product) notFound();
  // strip Dates for the client component
  const { createdAt, updatedAt, ...rest } = product;
  return (
    <ProductEditor
      key={product.id}
      product={{ ...rest, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() }}
      meta={meta}
      storeName={storeName}
      aiOn={aiOn}
      isAdmin={user.role === "ADMIN"}
    />
  );
}
