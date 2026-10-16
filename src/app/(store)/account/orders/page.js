import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import OrderRow from "@/components/account/OrderRow";

export const metadata = { title: "Orders" };

export default async function AccountOrders() {
  const user = await getCurrentUser();
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { orderNumber: true, createdAt: true, status: true, total: true, items: { select: { name: true, image: true, quantity: true } } },
  });
  return (
    <section aria-labelledby="orders-title" className="rounded-xl border border-line bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-5">
        <h1 id="orders-title" className="text-lg font-bold text-bone sm:text-xl">
          My Orders
        </h1>
        <p className="text-[13px] text-mute">{orders.length} total</p>
      </div>
      {orders.length ? (
        <ul className="px-4 sm:px-5">
          {orders.map((o) => (
            <OrderRow key={o.orderNumber} order={o} />
          ))}
        </ul>
      ) : (
        <div className="px-4 py-10 text-center sm:px-5">
          <p className="text-lg font-bold text-bone">No orders yet</p>
          <p className="mx-auto mt-1 max-w-md text-[14px] text-mute">
            Placed an order as a guest? Orders made with this account&apos;s email and mobile number are linked automatically.
          </p>
          <Link href="/watches" className="btn btn-gold btn-sm mt-5">
            Shop watches <ArrowRight className="size-4" strokeWidth={2} />
          </Link>
        </div>
      )}
    </section>
  );
}
