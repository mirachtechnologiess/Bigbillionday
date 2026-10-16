import { requireAdminPage } from "@/lib/admin-api";
import { editorMeta } from "@/lib/admin-editor-meta";
import ProductEditor from "@/components/admin/products/ProductEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const user = await requireAdminPage();
  const { meta, storeName, aiOn } = await editorMeta();
  return <ProductEditor product={null} meta={meta} storeName={storeName} aiOn={aiOn} isAdmin={user.role === "ADMIN"} />;
}
