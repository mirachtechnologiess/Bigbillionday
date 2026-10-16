import { db } from "@/lib/db";
import { adminRoute, toCsv, csvResponse } from "@/lib/admin-api";
import { orderWhere } from "@/lib/admin-orders";

const COLS = [
  "orderNumber", "date", "status", "name", "email", "phone", "address", "city", "state", "pincode", "items", "itemCount",
  "subtotal", "discount", "couponCode", "shippingFee", "codFee", "total", "paymentMethod", "paymentStatus", "courier",
  "trackingNumber", "riskScore", "riskReason",
];

export const GET = adminRoute(async (req) => {
  const sp = new URL(req.url).searchParams;
  const orders = await db.order.findMany({
    where: orderWhere(sp),
    orderBy: { createdAt: "desc" },
    take: 10000,
    include: { items: { select: { sku: true, quantity: true } } },
  });
  const rows = orders.map((o) => ({
    orderNumber: o.orderNumber,
    date: o.createdAt.toISOString(),
    status: o.status,
    name: o.shippingName,
    email: o.email,
    phone: o.phone,
    address: [o.line1, o.line2, o.landmark].filter(Boolean).join(", "),
    city: o.city,
    state: o.state,
    pincode: o.pincode,
    items: o.items.map((i) => `${i.sku} x${i.quantity}`).join(" | "),
    itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
    subtotal: o.subtotal,
    discount: o.discount,
    couponCode: o.couponCode,
    shippingFee: o.shippingFee,
    codFee: o.codFee,
    total: o.total,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    courier: o.courier,
    trackingNumber: o.trackingNumber,
    riskScore: o.riskScore,
    riskReason: o.riskReason,
  }));
  return csvResponse(toCsv(rows, COLS), `orders-${new Date().toISOString().slice(0, 10)}.csv`);
});
