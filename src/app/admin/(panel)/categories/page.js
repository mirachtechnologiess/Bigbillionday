import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-api";
import CategoriesManager from "@/components/admin/categories/CategoriesManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const user = await requireAdminPage();
  const rows = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true, children: true } } } });
  const categories = rows.map(({ _count, ...c }) => ({ ...c, productCount: _count.products, childCount: _count.children }));
  return <CategoriesManager categories={categories} canDelete={user.role === "ADMIN"} />;
}
