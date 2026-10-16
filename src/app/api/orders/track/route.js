import { db } from "@/lib/db";
import { handle, ok, HttpError, rateLimit, clientIp } from "@/lib/api";
import { trackSchema, normalizePhone } from "@/lib/validators";
import { timelineFromEvents } from "@/lib/orders";
import { ORDER_STATUS_LABEL } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders/track?orderNumber=PS...&phone=98xxxxxxxx
 * → { orderNumber, status, statusLabel, placedAt, city, state, courier, trackingNumber, itemCount, paymentMethod, timeline:[{status,label,note,at}] }
 */
export const GET = handle(async (req) => {
  rateLimit(`track:${clientIp(req)}`, 10, 60_000);
  const sp = req.nextUrl.searchParams;
  const { orderNumber, phone } = trackSchema.parse({ orderNumber: sp.get("orderNumber") || "", phone: sp.get("phone") || "" });
  const order = await db.order.findUnique({
    where: { orderNumber },
    select: {
      orderNumber: true,
      phone: true,
      status: true,
      createdAt: true,
      city: true,
      state: true,
      courier: true,
      trackingNumber: true,
      paymentMethod: true,
      items: { select: { quantity: true } },
      events: { orderBy: { createdAt: "asc" }, select: { status: true, note: true, createdAt: true } },
    },
  });
  // Same response for "not found" and "wrong phone" so order numbers can't be probed
  if (!order || normalizePhone(order.phone) !== phone)
    throw new HttpError(404, "We couldn't find an order with those details. Please check and try again.");
  return ok({
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: ORDER_STATUS_LABEL[order.status],
    placedAt: order.createdAt,
    city: order.city,
    state: order.state,
    courier: order.courier,
    trackingNumber: order.trackingNumber,
    paymentMethod: order.paymentMethod,
    itemCount: order.items.reduce((n, i) => n + i.quantity, 0),
    timeline: timelineFromEvents(order.events),
  });
});
