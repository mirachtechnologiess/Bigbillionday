import "server-only";
import crypto from "node:crypto";
import { db } from "./db";
import { HttpError } from "./api";
import { aiEnabled, chatJson } from "./ai";
import { couponDiscount } from "./pricing";
import { getCurrentUser, isAdminRole } from "./auth";
import { verifyOrderToken } from "./order-token";
import { ORDER_STATUS_LABEL } from "./utils";

/* ───────────────────────── Coupons ───────────────────────── */

/** Validates a coupon against a subtotal. Throws HttpError(400) with a customer-friendly message. */
export async function findValidCoupon(code, subtotal) {
  const clean = String(code || "").trim().toUpperCase();
  if (!clean) throw new HttpError(400, "Enter a coupon code");
  const c = await db.coupon.findUnique({ where: { code: clean } });
  const now = new Date();
  if (!c || !c.isActive) throw new HttpError(400, "This code isn't valid");
  if (c.startsAt && c.startsAt > now) throw new HttpError(400, "This code isn't active yet");
  if (c.endsAt && c.endsAt < now) throw new HttpError(400, "This code has expired");
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) throw new HttpError(400, "This code has reached its usage limit");
  if (subtotal < c.minOrder) throw new HttpError(400, `Add items worth ₹${(c.minOrder - subtotal).toLocaleString("en-IN")} more to use this code`);
  return c;
}

export const sanitizeCoupon = (c) => ({
  code: c.code,
  type: c.type,
  value: c.value,
  minOrder: c.minOrder,
  maxDiscount: c.maxDiscount,
  description: c.description,
});

export { couponDiscount };

/* ───────────────────────── Serviceability ───────────────────────── */

export function isServiceable(pincode, shipping) {
  const list = String(shipping?.serviceablePincodes || "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!list.length) return true;
  return list.some((p) => String(pincode).startsWith(p));
}

/* ───────────────────────── Order access ───────────────────────── */

export const orderInclude = {
  items: { include: { product: { select: { slug: true } } } },
  events: { orderBy: { createdAt: "asc" } },
};

/** Returns the order if the viewer owns it, is staff, or holds a valid guest token. */
export async function getOrderForViewer(orderNumber, token) {
  const num = String(orderNumber || "").toUpperCase();
  if (!/^[A-Z0-9]{6,30}$/.test(num)) return null;
  const order = await db.order.findUnique({ where: { orderNumber: num }, include: orderInclude });
  if (!order) return null;
  if (token && verifyOrderToken(order.orderNumber, token)) return order;
  const user = await getCurrentUser();
  if (user && (order.userId === user.id || isAdminRole(user.role))) return order;
  return null;
}

export const timelineFromEvents = (events = []) =>
  events.map((e) => ({ status: e.status, label: ORDER_STATUS_LABEL[e.status] || e.status, note: e.note || null, at: e.createdAt }));

export const CANCELLABLE = ["PENDING", "CONFIRMED"];

/** Cancels an order and restores inventory, inside a transaction. */
export async function cancelOrder(orderId, note = "Cancelled by customer") {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new HttpError(404, "Order not found");
    if (!CANCELLABLE.includes(order.status)) throw new HttpError(409, "This order can no longer be cancelled");
    const res = await tx.order.updateMany({ where: { id: order.id, status: { in: CANCELLABLE } }, data: { status: "CANCELLED" } });
    if (res.count === 0) throw new HttpError(409, "This order can no longer be cancelled");
    for (const it of order.items) {
      if (!it.productId) continue;
      await tx.product.updateMany({
        where: { id: it.productId },
        data: { stock: { increment: it.quantity }, soldCount: { decrement: it.quantity } },
      });
    }
    if (order.couponCode) {
      await tx.coupon.updateMany({ where: { code: order.couponCode, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
    }
    await tx.orderEvent.create({ data: { orderId: order.id, status: "CANCELLED", note } });
    return { ...order, status: "CANCELLED" };
  });
}

/* ───────────────────────── COD risk (AI, best-effort) ───────────────────────── */

export async function scoreCodRisk(orderId) {
  if (!(await aiEnabled())) return;
  try {
    const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true, user: { select: { name: true } } } });
    if (!order || order.paymentMethod !== "COD") return;
    const history = await db.order.groupBy({
      by: ["status"],
      where: { phone: order.phone, id: { not: order.id } },
      _count: { _all: true },
    });
    const count = (s) => history.filter((h) => s.includes(h.status)).reduce((n, h) => n + h._count._all, 0);
    const previous = history.reduce((n, h) => n + h._count._all, 0);
    const signals = {
      firstOrderForPhone: previous === 0,
      previousOrders: previous,
      previousDelivered: count(["DELIVERED"]),
      previousCancelledOrReturned: count(["CANCELLED", "RETURNED", "RETURN_REQUESTED"]),
      orderValueINR: order.total,
      itemCount: order.items.reduce((n, i) => n + i.quantity, 0),
      pincode: order.pincode,
      city: order.city,
      state: order.state,
      shippingName: order.shippingName,
      accountName: order.user?.name || null,
      guestCheckout: !order.userId,
      emailDomain: order.email.split("@")[1],
      address: [order.line1, order.line2, order.landmark].filter(Boolean).join(", "),
      couponUsed: Boolean(order.couponCode),
    };
    const out = await chatJson({
      task: "cod-risk",
      maxTokens: 220,
      system:
        "You assess Cash-on-Delivery fraud/RTO (return-to-origin) risk for an Indian online watch store. " +
        "Score 0 (very safe) to 100 (very risky). Consider: repeat cancellations/returns, first-time high-value orders, " +
        "vague or very short addresses, missing house numbers, name mismatch between account and recipient, disposable email domains, " +
        "unusually many units. A normal first order with a complete address is about 15-30. " +
        'Reply ONLY with JSON: {"score": number, "reason": "max 140 chars, plain English"}',
      messages: [{ role: "user", content: JSON.stringify(signals) }],
    });
    const score = Math.max(0, Math.min(100, Math.round(Number(out?.score))));
    if (!Number.isFinite(score)) return;
    await db.order.update({
      where: { id: order.id },
      data: { riskScore: score, riskReason: String(out?.reason || "").slice(0, 200) || null },
    });
  } catch (e) {
    console.warn("[cod-risk]", e?.message);
  }
}

/* ───────────────────────── Razorpay ───────────────────────── */

const rzpAuth = () =>
  "Basic " + Buffer.from(`${process.env.RAZORPAY_KEY_ID || ""}:${process.env.RAZORPAY_KEY_SECRET || ""}`).toString("base64");

export const razorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

export async function createRazorpayOrder({ amount, receipt, notes }) {
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: rzpAuth() },
    body: JSON.stringify({ amount: amount * 100, currency: "INR", receipt, notes }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id) throw new HttpError(502, data?.error?.description || "Payment gateway unavailable. Please try again.");
  return data;
}

export function verifyRazorpaySignature(orderId, paymentId, signature) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
