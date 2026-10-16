import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-api";
import CouponsManager from "@/components/admin/coupons/CouponsManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coupons" };

export default async function CouponsPage() {
  const user = await requireAdminPage();
  const rows = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const coupons = rows.map((c) => ({
    ...c,
    startsAt: c.startsAt?.toISOString() ?? null,
    endsAt: c.endsAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  }));
  return <CouponsManager coupons={coupons} canDelete={user.role === "ADMIN"} />;
}
