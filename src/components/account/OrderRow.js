import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { formatINR } from "@/lib/utils";
import StatusChip from "@/components/commerce/StatusChip";
import { formatDate } from "@/components/commerce/format";

/** Order list row. order: { orderNumber, createdAt, status, total, items:[{name,image,quantity}] } */
export default function OrderRow({ order }) {
  const count = order.items.reduce((n, i) => n + i.quantity, 0);
  return (
    <li>
      <Link
        href={`/account/orders/${order.orderNumber}`}
        className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-line py-4 transition-colors sm:gap-5"
      >
        <div className="flex -space-x-5">
          {order.items.slice(0, 3).map((it, i) => (
            <div
              key={i}
              className="relative size-14 overflow-hidden rounded-lg border border-line bg-ink-2 ring-2 ring-white sm:size-16"
              style={{ zIndex: 3 - i }}
            >
              {it.image && <Image src={it.image} alt="" fill sizes="64px" className="object-cover" />}
            </div>
          ))}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <p className="font-mono text-[13px] font-semibold text-bone group-hover:text-gold-2">{order.orderNumber}</p>
            <StatusChip status={order.status} className="h-6 px-2.5 text-[11px]" />
          </div>
          <p className="mt-1 truncate text-[13px] text-bone-2">
            {order.items[0]?.name}
            {order.items.length > 1 && ` + ${order.items.length - 1} more`}
          </p>
          <p className="mt-0.5 text-[12px] text-mute">
            {formatDate(order.createdAt)} · {count} {count === 1 ? "item" : "items"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-right">
          <p className="text-[15px] font-bold text-bone tabular-nums sm:text-[17px]">{formatINR(order.total)}</p>
          <ChevronRight className="hidden size-4 text-mute transition group-hover:text-gold sm:block" strokeWidth={2} />
        </div>
      </Link>
    </li>
  );
}
