import { after } from "next/server";
import { db } from "@/lib/db";
import { handle, ok, HttpError, rateLimit, clientIp } from "@/lib/api";
import { checkoutSchema } from "@/lib/validators";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { computeTotals } from "@/lib/pricing";
import { generateOrderNumber, formatINR } from "@/lib/utils";
import { orderToken } from "@/lib/order-token";
import { findValidCoupon, isServiceable, scoreCodRisk, createRazorpayOrder, razorpayConfigured, cancelOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders
 * body: checkoutSchema (email, phone, name, line1, line2?, landmark?, pincode, city, state,
 *       paymentMethod "COD"|"RAZORPAY", couponCode?, notes?, saveAddress?, items:[{productId, quantity}])
 * → { orderNumber, token, total, razorpay? : { keyId, orderId, amount, currency, name, prefill } }
 */
export const POST = handle(async (req) => {
  rateLimit(`orders:${clientIp(req)}`, 5, 60_000);
  const input = checkoutSchema.parse(await req.json());
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const { payment, shipping, store } = settings;

  // Payment method gates
  const method = input.paymentMethod;
  if (method === "COD" && !payment.codEnabled) throw new HttpError(400, "Cash on Delivery is temporarily unavailable");
  if (method === "RAZORPAY" && (!payment.razorpayEnabled || !razorpayConfigured()))
    throw new HttpError(400, "Online payment is coming soon. Please choose Cash on Delivery.");

  if (!isServiceable(input.pincode, shipping))
    throw new HttpError(400, "We don't deliver to this pincode yet. Please try another address.");

  // Merge duplicate lines, then load authoritative product data
  const qtyById = new Map();
  for (const it of input.items) qtyById.set(it.productId, Math.min(10, (qtyById.get(it.productId) || 0) + it.quantity));
  const products = await db.product.findMany({
    where: { id: { in: [...qtyById.keys()] } },
    select: {
      id: true, name: true, sku: true, price: true, mrp: true, stock: true, status: true, codAvailable: true,
      brand: { select: { name: true } },
      images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = [];
  for (const [productId, quantity] of qtyById) {
    const p = byId.get(productId);
    if (!p || p.status !== "ACTIVE") throw new HttpError(409, "An item in your bag is no longer available. Please review your bag.");
    if (p.stock < quantity)
      throw new HttpError(409, p.stock > 0 ? `Only ${p.stock} left of ${p.name}. Please update the quantity.` : `${p.name} just sold out.`);
    if (method === "COD" && !p.codAvailable) throw new HttpError(400, `${p.name} isn't eligible for Cash on Delivery.`);
    lines.push({ product: p, quantity, price: p.price, mrp: p.mrp });
  }

  // Coupon + totals (server-side, DB prices)
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const coupon = input.couponCode ? await findValidCoupon(input.couponCode, subtotal) : null;
  const totals = computeTotals({ items: lines, coupon, shipping, payment, method });
  if (method === "COD" && payment.codMaxOrder && totals.total > payment.codMaxOrder)
    throw new HttpError(400, `Cash on Delivery is available on orders up to ${formatINR(payment.codMaxOrder)}.`);

  // Create the order atomically (stock is guarded by a conditional update)
  let order;
  for (let attempt = 0; attempt < 3 && !order; attempt++) {
    const orderNumber = generateOrderNumber();
    try {
      order = await db.$transaction(async (tx) => {
        for (const l of lines) {
          const r = await tx.product.updateMany({
            where: { id: l.product.id, status: "ACTIVE", stock: { gte: l.quantity } },
            data: { stock: { decrement: l.quantity }, soldCount: { increment: l.quantity } },
          });
          if (r.count === 0) throw new HttpError(409, `${l.product.name} just sold out or has limited stock. Please review your bag.`);
        }
        if (coupon) {
          const r = await tx.coupon.updateMany({
            where: {
              id: coupon.id,
              isActive: true,
              ...(coupon.usageLimit != null && { usedCount: { lt: coupon.usageLimit } }),
            },
            data: { usedCount: { increment: 1 } },
          });
          if (r.count === 0) throw new HttpError(409, "This coupon was just used up. Please remove it and try again.");
        }
        return tx.order.create({
          data: {
            orderNumber,
            userId: user?.id ?? null,
            email: input.email,
            phone: input.phone,
            shippingName: input.name,
            line1: input.line1,
            line2: input.line2,
            landmark: input.landmark,
            city: input.city,
            state: input.state,
            pincode: input.pincode,
            subtotal: totals.subtotal,
            discount: totals.discount,
            shippingFee: totals.shippingFee,
            codFee: totals.codFee,
            total: totals.total,
            couponCode: coupon?.code ?? null,
            paymentMethod: method,
            paymentStatus: "PENDING",
            notes: input.notes,
            items: {
              create: lines.map((l) => ({
                productId: l.product.id,
                name: l.product.name,
                brand: l.product.brand?.name || "",
                sku: l.product.sku,
                image: l.product.images[0]?.url ?? null,
                price: l.price,
                quantity: l.quantity,
              })),
            },
            events: {
              create: {
                status: "PENDING",
                note: method === "COD" ? "Order placed · Cash on Delivery" : "Order placed · awaiting online payment",
              },
            },
          },
          select: { id: true, orderNumber: true, total: true },
        });
      });
    } catch (e) {
      // Retry only on order-number collision
      if (e?.code === "P2002" && String(e?.meta?.target || "").includes("orderNumber")) continue;
      throw e;
    }
  }
  if (!order) throw new HttpError(500, "Could not place the order. Please try again.");

  // Save address to the account (best-effort)
  if (user && input.saveAddress) {
    try {
      const exists = await db.address.findFirst({ where: { userId: user.id, line1: input.line1, pincode: input.pincode } });
      if (!exists) {
        const count = await db.address.count({ where: { userId: user.id } });
        await db.address.create({
          data: {
            userId: user.id, name: input.name, phone: input.phone, line1: input.line1, line2: input.line2,
            landmark: input.landmark, city: input.city, state: input.state, pincode: input.pincode, isDefault: count === 0,
          },
        });
      }
    } catch {}
  }

  // AI COD risk scoring — after the response, never blocks the order
  if (method === "COD" && settings.ai?.codRiskScoring) after(() => scoreCodRisk(order.id));

  const res = { orderNumber: order.orderNumber, token: orderToken(order.orderNumber), total: order.total };

  if (method === "RAZORPAY") {
    let rzp;
    try {
      rzp = await createRazorpayOrder({ amount: order.total, receipt: order.orderNumber, notes: { orderNumber: order.orderNumber } });
    } catch (e) {
      // Release the reserved stock if the gateway is down
      await cancelOrder(order.id, "Payment gateway unavailable — order released").catch(() => {});
      throw e;
    }
    await db.order.update({ where: { id: order.id }, data: { razorpayId: rzp.id } });
    res.razorpay = {
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: rzp.id,
      amount: rzp.amount,
      currency: rzp.currency,
      name: store.name,
      prefill: { name: input.name, email: input.email, contact: input.phone },
    };
  }

  return ok(res, { status: 201 });
});
