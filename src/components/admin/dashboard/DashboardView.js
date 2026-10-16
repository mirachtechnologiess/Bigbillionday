"use client";

import Link from "next/link";
import {
  AlertTriangle, ArrowUpRight, Banknote, CalendarDays, Crown, Gauge, IndianRupee, Mail, MessageSquareText, Package, Receipt, ShoppingBag, Wallet,
} from "lucide-react";
import { Card, Empty, OrderStatusPill, RiskPill, Stat, StockPill, ORDER_TONE, timeAgo } from "../ui";
import { cn, formatINR, ORDER_STATUS_LABEL } from "@/lib/utils";
import LazyCharts from "./LazyCharts";
import AiInsights from "./AiInsights";

const BAR_COLOR = {
  gold: "var(--color-gold)",
  info: "#0b7d78",
  lume: "var(--color-lume)",
  danger: "var(--color-danger)",
  ember: "var(--color-ember)",
  mute: "var(--color-mute)",
};

function Thumb({ src }) {
  return (
    <div className="h-9 w-9 flex-none overflow-hidden rounded-lg border border-line bg-ink-3">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <Package className="m-2.5 h-4 w-4 text-mute" />
      )}
    </div>
  );
}

const pctDelta = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : undefined);

export default function DashboardView({ stats: s, hello, date, aiOn }) {
  const rev = s.series.map((d) => d.revenue);
  const ord = s.series.map((d) => d.orders);
  const statusRows = Object.keys(ORDER_STATUS_LABEL).map((k) => ({ status: k, count: s.byStatus[k] || 0 }));
  const maxStatus = Math.max(1, ...statusRows.map((r) => r.count));
  const totalStatus = statusRows.reduce((a, r) => a + r.count, 0);
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="eyebrow mb-1.5 flex items-center gap-1.5 !text-[10px]">
            <CalendarDays className="h-3 w-3" /> {date} · IST
          </div>
          <h1 className="font-display text-[30px] leading-none tracking-tight sm:text-[38px]">{hello}.</h1>
          <p className="mt-2 text-[13px] text-mute">
            {s.orders.today ? (
              <>
                <span className="a-num text-bone">{s.orders.today}</span> order{s.orders.today === 1 ? "" : "s"} so far today, worth{" "}
                <span className="a-num text-gold-2">{formatINR(s.revenue.today)}</span>.
              </>
            ) : (
              "No orders yet today. The day is young."
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/reviews?status=PENDING" className={cn("a-btn a-btn-sm", !s.pendingReviews && "a-btn-ghost")}>
            <MessageSquareText /> <span className="a-num">{s.pendingReviews}</span> pending review{s.pendingReviews === 1 ? "" : "s"}
          </Link>
          <Link href="/admin/messages" className={cn("a-btn a-btn-sm", !s.unreadMessages && "a-btn-ghost")}>
            <Mail /> <span className="a-num">{s.unreadMessages}</span> unread message{s.unreadMessages === 1 ? "" : "s"}
          </Link>
        </div>
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Revenue today" value={formatINR(s.revenue.today)} sub={plural(s.orders.today, "order")} spark={rev.slice(-7)} icon={IndianRupee} />
        <Stat label="Revenue 7d" value={formatINR(s.revenue.d7)} sub={plural(s.orders.d7, "order")} spark={rev.slice(-7)} icon={Wallet} />
        <Stat label="Revenue 30d" value={formatINR(s.revenue.d30)} delta={pctDelta(s.revenue.d30, s.revenue.prev30)} sub="vs prev 30d" spark={rev} icon={Banknote} />
        <Stat
          label="Orders 30d"
          value={s.orders.d30}
          delta={pctDelta(s.orders.d30, s.orders.prev30)}
          sub="vs prev 30d"
          spark={ord}
          tone="lume"
          icon={ShoppingBag}
          href="/admin/orders"
        />
        <Stat label="Avg order value" value={formatINR(s.aov)} sub="last 30 days" icon={Receipt} />
        <Stat label="COD to collect" value={formatINR(s.cod.amount)} sub={`${plural(s.cod.count, "open order")}`} tone="ember" icon={Banknote} href="/admin/orders?payment=COD" />
        <Stat
          label="Conversion"
          value={s.funnel.conversion == null ? "—" : `${(s.funnel.conversion * 100).toFixed(2)}%`}
          sub={s.funnel.conversion == null ? `Needs 100+ product views (${s.funnel.views.toLocaleString("en-IN")} so far)` : `${s.funnel.sold.toLocaleString("en-IN")} sold / ${s.funnel.views.toLocaleString("en-IN")} views`}
          tone="lume"
          icon={Gauge}
        />
        <Stat label="New customers" value={s.newCustomers} sub="last 30 days" icon={Crown} href="/admin/customers" />
      </div>

      <LazyCharts series={s.series} />

      <AiInsights aiOn={aiOn} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Orders by status" icon={Gauge} actions={<span className="a-num text-[11px] text-mute">{totalStatus} total</span>}>
          <ul className="space-y-2">
            {statusRows.map((r) => (
              <li key={r.status}>
                <Link href={`/admin/orders?status=${r.status}`} className="group grid grid-cols-[118px_1fr_36px] items-center gap-3 text-[12.5px]">
                  <span className="truncate text-bone-2 group-hover:text-bone">{ORDER_STATUS_LABEL[r.status]}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-ink-4">
                    <span
                      className="block h-full rounded-full transition-all group-hover:brightness-125"
                      style={{ width: `${(r.count / maxStatus) * 100}%`, background: BAR_COLOR[ORDER_TONE[r.status]] || BAR_COLOR.mute, opacity: r.count ? 0.85 : 0 }}
                    />
                  </span>
                  <span className="a-num text-right text-bone">{r.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Top sellers · 30d" icon={Crown} actions={<Link href="/admin/products" className="text-[11.5px] text-mute hover:text-gold-2">All products</Link>}>
          {s.top.length ? (
            <ul className="divide-y divide-line">
              {s.top.map((p, i) => (
                <li key={p.id}>
                  <Link href={`/admin/products/${p.id}`} className="group flex items-center gap-3 py-2">
                    <span className="w-4 font-mono text-[11px] text-gold-3">{i + 1}</span>
                    <Thumb src={p.image} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] group-hover:text-gold-2">{p.name}</span>
                      <span className="text-[11px] text-mute">
                        <span className="a-num">{p.qty}</span> units · stock <span className="a-num">{p.stock}</span>
                      </span>
                    </span>
                    <span className="a-num text-[12.5px] text-bone">{formatINR(p.revenue)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-[12.5px] text-mute">No sales in the last 30 days yet.</p>
          )}
        </Card>

        <Card
          title="Low stock"
          icon={AlertTriangle}
          actions={
            <Link href="/admin/inventory" className="inline-flex items-center gap-1 text-[11.5px] text-mute hover:text-gold-2">
              Inventory <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          {s.lowStock.length ? (
            <ul className="divide-y divide-line">
              {s.lowStock.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/inventory?q=${encodeURIComponent(p.sku)}`} className="group flex items-center gap-3 py-2">
                    <Thumb src={p.image} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] group-hover:text-gold-2">{p.name}</span>
                      <span className="font-mono text-[10.5px] text-mute">
                        {p.sku} · {p.soldCount} sold
                      </span>
                    </span>
                    <StockPill stock={p.stock} lowStockAt={p.lowStockAt} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-[12.5px] text-mute">All stocked up. Nothing is at or below its alert level.</p>
          )}
        </Card>
      </div>

      <Card
        title="Recent orders"
        icon={ShoppingBag}
        bodyClass="!p-0"
        actions={
          <Link href="/admin/orders" className="inline-flex items-center gap-1 text-[11.5px] text-mute hover:text-gold-2">
            All orders <ArrowUpRight className="h-3 w-3" />
          </Link>
        }
      >
        {s.recentOrders.length ? (
          <div className="overflow-x-auto">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th className="!text-right">Total</th>
                  <th>Pay</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {s.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/admin/orders/${o.id}`} className="font-mono text-[12px] text-gold-2 hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="max-w-[200px]">
                      <div className="truncate">{o.shippingName}</div>
                      <div className="truncate text-[11px] text-mute">{o.city}</div>
                    </td>
                    <td className="a-num text-right">{formatINR(o.total)}</td>
                    <td className="font-mono text-[11px] text-mute">{o.paymentMethod}</td>
                    <td>
                      <OrderStatusPill status={o.status} />
                    </td>
                    <td>
                      <RiskPill score={o.riskScore} />
                    </td>
                    <td className="whitespace-nowrap text-[12px] text-mute" suppressHydrationWarning>
                      {timeAgo(o.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <Empty icon={ShoppingBag} title="No orders yet">
              Your first order will appear here the moment it lands.
            </Empty>
          </div>
        )}
      </Card>
    </div>
  );
}
