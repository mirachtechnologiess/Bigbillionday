import AdminShell from "@/components/admin/AdminShell";
import { requireAdminPage } from "@/lib/admin-api";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { aiEnabled } from "@/lib/ai";

export const dynamic = "force-dynamic";

async function badgeCounts() {
  try {
    const [pendingOrders, pendingReviews, unreadMessages, lowStock] = await Promise.all([
      db.order.count({ where: { status: "PENDING" } }),
      db.review.count({ where: { status: "PENDING" } }),
      db.contactMessage.count({ where: { isRead: false } }),
      db.product.count({ where: { status: "ACTIVE", stock: { lte: db.product.fields.lowStockAt } } }),
    ]);
    return { pendingOrders, pendingReviews, unreadMessages, lowStock };
  } catch {
    return {};
  }
}

export default async function PanelLayout({ children }) {
  const user = await requireAdminPage();
  const [badges, settings] = await Promise.all([badgeCounts(), getSettings()]);
  return (
    <AdminShell user={{ name: user.name, role: user.role, email: user.email }} badges={badges} storeName={settings.store.name} aiOn={await aiEnabled()}>
      {children}
    </AdminShell>
  );
}
