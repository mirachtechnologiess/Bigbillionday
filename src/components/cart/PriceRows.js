import { formatINR, cn } from "@/lib/utils";

/** Price breakdown from computeTotals(). */
export default function PriceRows({ totals, itemCount, coupon, showCod = true, totalLabel = "Total", className }) {
  const mrpSaving = totals.mrpTotal - totals.subtotal;
  return (
    <dl className={cn("space-y-3 text-[14px]", className)}>
      <Row label={`Subtotal${itemCount ? ` · ${itemCount} ${itemCount === 1 ? "item" : "items"}` : ""}`} value={formatINR(totals.subtotal)} />
      {mrpSaving > 0 && <Row label="Savings on MRP" value={`− ${formatINR(mrpSaving)}`} tone="lume" muted />}
      {totals.discount > 0 && <Row label={`Coupon${coupon?.code ? ` · ${coupon.code}` : ""}`} value={`− ${formatINR(totals.discount)}`} tone="lume" />}
      <Row label="Shipping" value={totals.shippingFee ? formatINR(totals.shippingFee) : "FREE"} tone={totals.shippingFee ? undefined : "lume"} />
      {showCod && totals.codFee > 0 && <Row label="Cash on Delivery fee" value={formatINR(totals.codFee)} />}
      <div className="flex items-end justify-between gap-4 border-t border-line pt-4">
        <dt>
          <span className="block text-[15px] font-bold text-bone">{totalLabel}</span>
          <span className="mt-1 block text-[11px] text-mute">Inclusive of all taxes</span>
        </dt>
        <dd className="text-2xl font-bold leading-none text-bone tabular-nums">{formatINR(totals.total)}</dd>
      </div>
      {totals.savings > 0 && (
        <p className="rounded-lg border border-lume/20 bg-lume/10 px-3 py-2 text-center text-[13px] font-semibold text-lume">
          You save {formatINR(totals.savings)} on this order
        </p>
      )}
    </dl>
  );
}

function Row({ label, value, tone, muted }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={muted ? "text-mute" : "text-bone-2"}>{label}</dt>
      <dd className={cn("text-[14px] font-medium tabular-nums", tone === "lume" ? "text-lume" : tone === "gold" ? "text-gold-2" : "text-bone")}>
        {value}
      </dd>
    </div>
  );
}
