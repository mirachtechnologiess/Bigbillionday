import Image from "next/image";
import Link from "next/link";
import { formatINR, cn } from "@/lib/utils";

/** Items, price breakdown and delivery address for a placed order (server-safe, no hooks). */
export default function OrderDetails({ order, className }) {
  const count = order.items.reduce((n, i) => n + i.quantity, 0);
  return (
    <div className={cn("overflow-hidden rounded-xl border border-line bg-white", className)}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-[16px] font-bold text-bone">Items in this order</h2>
        <p className="text-[13px] text-mute">
          {count} {count === 1 ? "item" : "items"}
        </p>
      </div>
      <ul className="divide-y divide-line">
        {order.items.map((it) => {
          const href = it.product?.slug ? `/watches/${it.product.slug}` : null;
          const name = <span className="line-clamp-2 text-[14px] font-semibold leading-snug text-bone">{it.name}</span>;
          return (
            <li key={it.id} className="flex gap-3 px-4 py-4 sm:px-5">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-line bg-ink-2">
                {it.image && <Image src={it.image} alt={it.name} fill sizes="80px" className="object-cover" />}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
                <div>
                  {it.brand && <p className="text-[12px] text-mute">{it.brand}</p>}
                  {href ? (
                    <Link href={href} className="hover:text-gold-2">
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                </div>
                <div className="flex items-baseline justify-between gap-2 text-[13px] text-bone-2">
                  <span>
                    {formatINR(it.price)} × {it.quantity}
                  </span>
                  <span className="font-bold text-bone">{formatINR(it.price * it.quantity)}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <dl className="space-y-2.5 border-t border-line px-4 py-4 text-[14px] sm:px-5">
        <Row label="Subtotal" value={formatINR(order.subtotal)} />
        {order.discount > 0 && (
          <Row label={`Coupon${order.couponCode ? ` · ${order.couponCode}` : ""}`} value={`− ${formatINR(order.discount)}`} accent />
        )}
        <Row label="Shipping" value={order.shippingFee ? formatINR(order.shippingFee) : "FREE"} accent={!order.shippingFee} />
        {order.codFee > 0 && <Row label="Cash on Delivery fee" value={formatINR(order.codFee)} />}
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <dt className="text-[15px] font-bold text-bone">Total</dt>
          <dd className="text-xl font-bold text-bone tabular-nums">{formatINR(order.total)}</dd>
        </div>
      </dl>
      <div className="grid gap-4 border-t border-line bg-ink-2 px-4 py-4 sm:grid-cols-2 sm:px-5">
        <div>
          <p className="text-[13px] font-semibold text-bone">Delivering to</p>
          <address className="mt-1 text-[14px] not-italic leading-relaxed text-bone-2">
            <span className="font-medium text-bone">{order.shippingName}</span>
            <br />
            {order.line1}
            {order.line2 && (
              <>
                <br />
                {order.line2}
              </>
            )}
            {order.landmark && (
              <>
                <br />
                Near {order.landmark}
              </>
            )}
            <br />
            {order.city}, {order.state} {order.pincode}
          </address>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-bone">Contact</p>
          <p className="mt-1 text-[14px] leading-relaxed text-bone-2">
            +91 {order.phone}
            <br />
            <span className="break-all">{order.email}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-bone-2">{label}</dt>
      <dd className={cn("text-[14px] font-medium tabular-nums", accent ? "text-lume" : "text-bone")}>{value}</dd>
    </div>
  );
}
