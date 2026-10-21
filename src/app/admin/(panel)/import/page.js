import { requireAdminPage } from "@/lib/admin-api";
import { aiEnabled } from "@/lib/ai";
import { db } from "@/lib/db";
import Importer from "@/components/admin/import/Importer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bulk import" };

export default async function ImportPage() {
  await requireAdminPage();
  const productCount = await db.product.count();
  return <Importer aiOn={await aiEnabled()} productCount={productCount} />;
}
