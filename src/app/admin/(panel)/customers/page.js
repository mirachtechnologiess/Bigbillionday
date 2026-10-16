import { db } from "@/lib/db";
import { requireAdminPage, paging } from "@/lib/admin-api";
import CustomersList from "@/components/admin/customers/CustomersList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers" };

const EXCLUDED = ["CANCELLED", "RETURNED"];

export default async function CustomersPage({ searchParams }) {
  const me = await requireAdminPage();
  const sp = await searchParams;
  const tab = sp.tab === "staff" ? "staff" : "customers";
  const { page, per, skip, take } = paging(sp, 30);
  const q = String(sp.q || "").trim();
  const blocked = sp.blocked === "1";

  const roleWhere = tab === "staff" ? { role: { in: ["STAFF", "ADMIN"] } } : { role: "CUSTOMER" };
  const where = {
    ...roleWhere,
    ...(blocked ? { isBlocked: true } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q.replace(/\D/g, "") || q } },
          ],
        }
      : {}),
  };

  const [users, total, customerCount, staffCount] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: { id: true, name: true, email: true, phone: true, role: true, isBlocked: true, createdAt: true, _count: { select: { orders: true } } },
    }),
    db.user.count({ where }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.user.count({ where: { role: { in: ["STAFF", "ADMIN"] } } }),
  ]);

  const spent = users.length
    ? await db.order.groupBy({
        by: ["userId"],
        where: { userId: { in: users.map((u) => u.id) }, status: { notIn: EXCLUDED } },
        _sum: { total: true },
        _max: { createdAt: true },
      })
    : [];
  const spentMap = new Map(spent.map((s) => [s.userId, s]));

  const rows = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    isBlocked: u.isBlocked,
    createdAt: u.createdAt.toISOString(),
    orders: u._count.orders,
    spent: spentMap.get(u.id)?._sum.total || 0,
    lastOrderAt: spentMap.get(u.id)?._max.createdAt?.toISOString() || null,
  }));

  return (
    <CustomersList
      tab={tab}
      rows={rows}
      counts={{ customers: customerCount, staff: staffCount }}
      page={page}
      pages={Math.max(1, Math.ceil(total / per))}
      total={total}
      me={{ id: me.id, role: me.role }}
    />
  );
}
