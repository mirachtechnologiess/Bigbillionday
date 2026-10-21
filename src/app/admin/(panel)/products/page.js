import Link from "next/link";
import { Plus, Sparkles, FileSpreadsheet } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-api";
import { listProducts } from "@/lib/admin-product-query";
import { aiEnabled } from "@/lib/ai";
import { PageHeader } from "@/components/admin/ui";
import ProductsTable from "@/components/admin/products/ProductsTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }) {
  const user = await requireAdminPage();
  const sp = await searchParams;
  const [data, brands, statusCounts, aiOn] = await Promise.all([
    listProducts(sp),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.product.groupBy({ by: ["status"], _count: true }),
    aiEnabled(),
  ]);
  const counts = Object.fromEntries(statusCounts.map((s) => [s.status, s._count]));
  counts.ALL = statusCounts.reduce((a, s) => a + s._count, 0);

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="Search, filter and edit the catalogue. Click a price or stock value to edit it inline."
        actions={
          <>
            <Link href="/admin/import" className="a-btn a-btn-ghost">
              <FileSpreadsheet /> Import
            </Link>
            <Link href="/admin/ai-studio" className="a-btn a-btn-ai">
              <Sparkles /> Photos → drafts
            </Link>
            <Link href="/admin/products/new" className="a-btn a-btn-gold">
              <Plus /> New product
            </Link>
          </>
        }
      />
      <ProductsTable data={data} brands={brands} counts={counts} isAdmin={user.role === "ADMIN"} aiOn={aiOn} />
    </>
  );
}
