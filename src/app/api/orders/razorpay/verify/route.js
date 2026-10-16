import { z } from "zod";
import { db } from "@/lib/db";
import { handle, ok, HttpError, rateLimit, clientIp } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { verifyRazorpaySignature, razorpayConfigured } from "@/lib/orders";
import { verifyOrderToken } from "@/lib/order-token";

const schema = z.object({
  orderNumber: z.string().min(6).max(30),
  token: z.string().max(64),
  razorpay_order_id: z.string().min(5).max(64),
  razorpay_payment_id: z.string().min(5).max(64),
  razorpay_signature: z.string().min(10).max(256),
});

/**
 * POST /api/orders/razorpay/verify
 * body { orderNumber, token, razorpay_order_id, razorpay_payment_id, razorpay_signature } → { ok: true, orderNumber }
 */
export const POST = handle(async (req) => {
  rateLimit(`rzp-verify:${clientIp(req)}`, 20, 60_000);
  const { payment } = await getSettings();
  if (!payment.razorpayEnabled || !razorpayConfigured()) throw new HttpError(400, "Online payments are not enabled");
  const b = schema.parse(await req.json());
  if (!verifyOrderToken(b.orderNumber, b.token)) throw new HttpError(403, "Invalid order token");
  const order = await db.order.findUnique({ where: { orderNumber: b.orderNumber } });
  if (!order || order.paymentMethod !== "RAZORPAY") throw new HttpError(404, "Order not found");
  if (order.paymentStatus === "PAID") return ok({ ok: true, orderNumber: order.orderNumber });
  const valid =
    order.razorpayId === b.razorpay_order_id &&
    verifyRazorpaySignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature);
  if (!valid) {
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } });
    throw new HttpError(400, "Payment could not be verified. If money was debited, it will be refunded automatically.");
  }
  await db.$transaction([
    db.order.update({
      where: { id: order.id },
      data: { paymentStatus: "PAID", status: order.status === "PENDING" ? "CONFIRMED" : order.status },
    }),
    db.orderEvent.create({ data: { orderId: order.id, status: "CONFIRMED", note: `Payment received online · ${b.razorpay_payment_id}` } }),
  ]);
  return ok({ ok: true, orderNumber: order.orderNumber });
});
