import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import OrderRow from "@/components/account/OrderRow";

export const metadata = { title: "Overview" };

const IN_TRANSIT = ["CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY"];

export default async function AccountOverview() {
  const user = await getCurrentUser();
  const [recent, totalOrders, inTransit, wishlistCount, address] = await Promise.all([
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { orderNumber: true, createdAt: true, status: true, total: true, items: { select: { name: true, image: true, quantity: true } } },
    }),
    db.order.count({ where: { userId: user.id } }),
    db.order.count({ where: { userId: user.id, status: { in: [...IN_TRANSIT, "PENDING"] } } }),
    db.wishlistItem.count({ where: { userId: user.id } }),
    db.address.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
  ]);

  const stats = [
    { label: "Orders", value: totalOrders, href: "/account/orders" },
    { label: "In progress", value: inTransit, href: "/account/orders" },
    { label: "Wishlist", value: wishlistCount, href: "/wishlist" },
  ];

  return (
    <div className="space-y-5">
      <section aria-label="At a glance" className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group rounded-xl border border-line bg-white px-3 py-4 transition-colors hover:border-gold sm:px-5"
          >
            <p className="text-[12px] font-medium text-mute sm:text-[13px]">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-bone tabular-nums group-hover:text-gold-2 sm:text-3xl">{s.value}</p>
          </Link>
        ))}
      </section>

      <section aria-labelledby="recent-title" className="rounded-xl border border-line bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-5">
          <h2 id="recent-title" className="text-lg font-bold text-bone">
            Recent orders
          </h2>
          {totalOrders > 0 && (
            <Link href="/account/orders" className="text-[13px] font-semibold text-gold-2 hover:underline">
              View all
            </Link>
          )}
        </div>
        {recent.length ? (
          <ul className="px-4 sm:px-5">
            {recent.map((o) => (
              <OrderRow key={o.orderNumber} order={o} />
            ))}
          </ul>
        ) : (
          <div className="px-4 py-8 text-center sm:px-5">
            <p className="text-[14px] text-bone-2">You have not placed any orders yet.</p>
            <Link href="/watches" className="btn btn-gold btn-sm mt-4">
              Shop watches <ArrowRight className="size-4" strokeWidth={2} />
            </Link>
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-bone">Default address</h2>
            <MapPin className="size-4 text-gold" strokeWidth={2} />
          </div>
          {address ? (
            <address className="mt-2 text-[14px] not-italic leading-relaxed text-bone-2">
              <span className="font-medium text-bone">{address.name}</span>
              <br />
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}
              <br />
              {address.city}, {address.state} {address.pincode}
            </address>
          ) : (
            <p className="mt-2 text-[14px] text-bone-2">Save an address for faster checkout.</p>
          )}
          <Link href="/account/addresses" className="mt-3 inline-block text-[13px] font-semibold text-gold-2 hover:underline">
            Manage addresses
          </Link>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 sm:p-5">
          <h2 className="text-[15px] font-bold text-bone">Profile</h2>
          <p className="mt-2 text-[14px] font-medium text-bone">{user.name}</p>
          <p className="mt-0.5 break-all text-[14px] text-bone-2">{user.email}</p>
          {user.phone && <p className="mt-0.5 text-[14px] text-bone-2">+91 {user.phone}</p>}
          <Link href="/account/profile" className="mt-3 inline-block text-[13px] font-semibold text-gold-2 hover:underline">
            Edit profile
          </Link>
        </div>
      </section>
    </div>
  );
}
