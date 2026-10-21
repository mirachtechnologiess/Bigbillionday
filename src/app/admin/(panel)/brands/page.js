import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-api";
import { aiEnabled } from "@/lib/ai";
import BrandsManager from "@/components/admin/brands/BrandsManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Brands" };

export default async function BrandsPage() {
  const user = await requireAdminPage();
  const rows = await db.brand.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  const brands = rows.map(({ _count, createdAt, ...b }) => ({ ...b, createdAt: createdAt.toISOString(), productCount: _count.products }));
  return <BrandsManager brands={brands} canDelete={user.role === "ADMIN"} aiOn={await aiEnabled()} />;
}
