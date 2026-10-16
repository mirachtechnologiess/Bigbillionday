import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-api";
import { getSettings } from "@/lib/settings";
import { withBannerProducts } from "@/lib/admin-banners";
import BannersManager from "@/components/admin/banners/BannersManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Banners & Homepage" };

export default async function BannersPage() {
  const user = await requireAdminPage();
  const [rows, settings] = await Promise.all([db.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }), getSettings()]);
  const banners = await withBannerProducts(rows);
  return <BannersManager banners={banners} home={settings.home} isAdmin={user.role === "ADMIN"} />;
}
