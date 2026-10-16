import "server-only";
import { db } from "./db";

export const DEAD_STATUSES = ["CANCELLED", "RETURNED"];
export const OPEN_STATUSES = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY"];

const DAY = 86_400_000;
const IST = 5.5 * 3600_000;

/** Start of "today" in IST, as a UTC Date. */
export function istDayStart(offsetDays = 0) {
  const now = Date.now() + IST;
  const start = Math.floor(now / DAY) * DAY - IST;
  return new Date(start - offsetDays * DAY);
}
const istKey = (d) => new Date(new Date(d).getTime() + IST).toISOString().slice(0, 10);

async function revenueSince(since) {
  const r = await db.order.aggregate({
    where: { createdAt: { gte: since }, status: { notIn: DEAD_STATUSES } },
    _sum: { total: true },
    _count: true,
  });
  return { revenue: r._sum.total || 0, orders: r._count || 0 };
}

/** Everything the dashboard needs, in one call. */
export async function dashboardStats() {
  const today = istDayStart(0);
  const d7 = istDayStart(6);
  const d30 = istDayStart(29);
  const d60 = istDayStart(59);

  const [rToday, r7, r30, rPrev30, byStatus, codPending, recentOrders, lowStock, series, viewsSold, topItems, pendingReviews, unreadMessages, customers30] =
    await Promise.all([
      revenueSince(today),
      revenueSince(d7),
      revenueSince(d30),
      db.order.aggregate({ where: { createdAt: { gte: d60, lt: d30 }, status: { notIn: DEAD_STATUSES } }, _sum: { total: true }, _count: true }),
      db.order.groupBy({ by: ["status"], _count: true }),
      db.order.aggregate({
        where: { paymentMethod: "COD", paymentStatus: "PENDING", status: { in: OPEN_STATUSES } },
        _sum: { total: true },
        _count: true,
      }),
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, orderNumber: true, shippingName: true, city: true, total: true, status: true, paymentMethod: true, riskScore: true, createdAt: true },
      }),
      db.product.findMany({
        where: { status: { not: "ARCHIVED" }, stock: { lte: db.product.fields.lowStockAt } },
        orderBy: { stock: "asc" },
        take: 8,
        select: { id: true, name: true, sku: true, stock: true, lowStockAt: true, soldCount: true, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } },
      }),
      db.order.findMany({ where: { createdAt: { gte: d30 } }, select: { createdAt: true, total: true, status: true } }),
      db.product.aggregate({ _sum: { viewCount: true, soldCount: true } }),
      db.orderItem.groupBy({
        by: ["productId"],
        where: { productId: { not: null }, order: { createdAt: { gte: d30 }, status: { notIn: DEAD_STATUSES } } },
        _sum: { quantity: true, price: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 6,
      }),
      db.review.count({ where: { status: "PENDING" } }),
      db.contactMessage.count({ where: { isRead: false } }),
      db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: d30 } } }),
    ]);

  // daily series
  const days = [];
  for (let i = 29; i >= 0; i--) days.push({ date: istKey(istDayStart(i)), revenue: 0, orders: 0, cancelled: 0 });
  const idx = Object.fromEntries(days.map((d, i) => [d.date, i]));
  for (const o of series) {
    const i = idx[istKey(o.createdAt)];
    if (i === undefined) continue;
    days[i].orders++;
    if (DEAD_STATUSES.includes(o.status)) days[i].cancelled++;
    else days[i].revenue += o.total;
  }

  const topIds = topItems.map((t) => t.productId);
  const topProducts = topIds.length
    ? await db.product.findMany({
        where: { id: { in: topIds } },
        select: { id: true, name: true, price: true, stock: true, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } },
      })
    : [];
  const top = topItems
    .map((t) => {
      const p = topProducts.find((x) => x.id === t.productId);
      return p ? { ...p, image: p.images[0]?.url || null, qty: t._sum.quantity || 0, revenue: (t._sum.quantity || 0) * p.price } : null;
    })
    .filter(Boolean);

  const views = viewsSold._sum.viewCount || 0;
  const sold = viewsSold._sum.soldCount || 0;

  return {
    revenue: { today: rToday.revenue, d7: r7.revenue, d30: r30.revenue, prev30: rPrev30._sum.total || 0 },
    orders: { today: rToday.orders, d7: r7.orders, d30: r30.orders, prev30: rPrev30._count || 0 },
    aov: r30.orders ? Math.round(r30.revenue / r30.orders) : 0,
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    cod: { amount: codPending._sum.total || 0, count: codPending._count || 0 },
    recentOrders,
    lowStock: lowStock.map((p) => ({ ...p, image: p.images[0]?.url || null })),
    series: days,
    // Units sold per product view. Meaningless on tiny samples, so null until there is enough traffic.
    funnel: { views, sold, conversion: views >= 100 ? Math.min(sold / views, 1) : null },
    top,
    pendingReviews,
    unreadMessages,
    newCustomers: customers30,
  };
}

/** Compact, model-friendly metrics for AI insights. */
export async function insightsMetrics() {
  const d30 = istDayStart(29);
  const [orders, items, stockOuts, slow, cancelByPin] = await Promise.all([
    db.order.findMany({ where: { createdAt: { gte: d30 } }, select: { createdAt: true, total: true, status: true, paymentMethod: true, state: true, discount: true, couponCode: true } }),
    db.orderItem.groupBy({
      by: ["productId", "name"],
      where: { order: { createdAt: { gte: d30 }, status: { notIn: DEAD_STATUSES } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
    db.product.findMany({ where: { status: "ACTIVE", stock: 0 }, select: { name: true, soldCount: true }, orderBy: { soldCount: "desc" }, take: 10 }),
    db.product.findMany({
      where: { status: "ACTIVE", stock: { gt: 5 } },
      select: { name: true, stock: true, soldCount: true, viewCount: true, price: true },
      orderBy: [{ soldCount: "asc" }, { stock: "desc" }],
      take: 8,
    }),
    db.order.groupBy({
      by: ["pincode", "city"],
      where: { createdAt: { gte: d30 }, status: { in: DEAD_STATUSES } },
      _count: true,
      orderBy: { _count: { pincode: "desc" } },
      take: 8,
    }),
  ]);
  const weeks = [0, 1, 2, 3].map((w) => {
    const from = istDayStart(w * 7 + 6);
    const to = istDayStart(w * 7 - 1);
    const os = orders.filter((o) => o.createdAt >= from && o.createdAt < to && !DEAD_STATUSES.includes(o.status));
    const rev = os.reduce((s, o) => s + o.total, 0);
    return { week: w === 0 ? "this week" : `${w} week(s) ago`, orders: os.length, revenue: rev, aov: os.length ? Math.round(rev / os.length) : 0 };
  });
  const total = orders.length;
  const cancelled = orders.filter((o) => DEAD_STATUSES.includes(o.status)).length;
  const cod = orders.filter((o) => o.paymentMethod === "COD").length;
  const byState = {};
  for (const o of orders) byState[o.state] = (byState[o.state] || 0) + 1;
  return {
    period: "last 30 days",
    totalOrders: total,
    cancelledOrReturned: cancelled,
    cancelRate: total ? +(cancelled / total).toFixed(3) : 0,
    codShare: total ? +(cod / total).toFixed(3) : 0,
    couponOrders: orders.filter((o) => o.couponCode).length,
    weeklyTrend: weeks.reverse(),
    topSellers: items.map((i) => ({ name: i.name, units: i._sum.quantity })),
    slowMovers: slow.map((p) => ({ name: p.name, stock: p.stock, sold: p.soldCount, views: p.viewCount, price: p.price })),
    outOfStockActive: stockOuts.map((p) => ({ name: p.name, lifetimeSold: p.soldCount })),
    cancellationsByPincode: cancelByPin.map((c) => ({ pincode: c.pincode, city: c.city, count: c._count })),
    topStates: Object.entries(byState).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([state, n]) => ({ state, orders: n })),
  };
}

/** Broad read-only snapshot for "Ask your store". */
export async function storeSnapshot() {
  const [dash, insights, counts, brands, reviews] = await Promise.all([
    dashboardStats(),
    insightsMetrics(),
    Promise.all([
      db.product.count(),
      db.product.count({ where: { status: "ACTIVE" } }),
      db.product.count({ where: { status: "DRAFT" } }),
      db.user.count({ where: { role: "CUSTOMER" } }),
      db.order.count(),
      db.newsletter.count(),
      db.coupon.findMany({ where: { isActive: true }, select: { code: true, type: true, value: true, usedCount: true, usageLimit: true, endsAt: true } }),
    ]),
    db.product.groupBy({ by: ["brandId"], _count: true, _sum: { soldCount: true, stock: true } }),
    db.review.aggregate({ _avg: { rating: true }, _count: true, where: { status: "APPROVED" } }),
  ]);
  const brandNames = await db.brand.findMany({ select: { id: true, name: true } });
  const bn = Object.fromEntries(brandNames.map((b) => [b.id, b.name]));
  const [products, active, drafts, customers, ordersAll, subscribers, coupons] = counts;
  return {
    today: new Date().toISOString().slice(0, 10),
    catalog: { products, active, drafts, brands: brands.map((b) => ({ brand: bn[b.brandId], products: b._count, unitsSold: b._sum.soldCount, stock: b._sum.stock })) },
    customers: { total: customers, newLast30d: dash.newCustomers, newsletterSubscribers: subscribers },
    orders: { allTime: ordersAll, byStatus: dash.byStatus, revenue: dash.revenue, counts: dash.orders, aov30d: dash.aov, codPendingToCollect: dash.cod },
    dailyLast30d: dash.series,
    topProducts30d: dash.top.map((t) => ({ name: t.name, units: t.qty, revenue: t.revenue, stock: t.stock })),
    lowStock: dash.lowStock.map((p) => ({ name: p.name, sku: p.sku, stock: p.stock })),
    funnel: dash.funnel,
    reviews: { approved: reviews._count, avgRating: reviews._avg.rating, pending: dash.pendingReviews },
    activeCoupons: coupons,
    ...insights,
  };
}
