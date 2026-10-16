import { requireAdminPage } from "@/lib/admin-api";
import { dashboardStats } from "@/lib/admin-metrics";
import { aiEnabled } from "@/lib/ai";
import DashboardView from "@/components/admin/dashboard/DashboardView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

function greeting() {
  const h = Number(new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await requireAdminPage();
  const stats = await dashboardStats();
  const data = {
    ...stats,
    recentOrders: stats.recentOrders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() })),
    lowStock: stats.lowStock.map(({ images: _i, ...p }) => p),
    top: stats.top.map(({ images: _i, ...p }) => p),
  };
  const date = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  return <DashboardView stats={data} hello={`${greeting()}, ${String(user.name || "there").split(" ")[0]}`} date={date} aiOn={aiEnabled()} />;
}
