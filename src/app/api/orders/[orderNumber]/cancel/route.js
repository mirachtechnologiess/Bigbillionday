import { db } from "@/lib/db";
import { handle, ok, HttpError, rateLimit, clientIp } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { cancelOrder } from "@/lib/orders";

/** POST /api/orders/{orderNumber}/cancel (owner only, while PENDING/CONFIRMED) → { ok: true, status: "CANCELLED" } */
export const POST = handle(async (req, { params }) => {
  rateLimit(`cancel:${clientIp(req)}`, 10, 60_000);
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Please sign in to manage your order");
  const { orderNumber } = await params;
  const order = await db.order.findUnique({
    where: { orderNumber: String(orderNumber).toUpperCase() },
    select: { id: true, userId: true },
  });
  if (!order || order.userId !== user.id) throw new HttpError(404, "Order not found");
  await cancelOrder(order.id, "Cancelled by customer");
  return ok({ ok: true, status: "CANCELLED" });
});
