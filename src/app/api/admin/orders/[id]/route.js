import { z } from "zod";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute, readJson, HttpError } from "@/lib/admin-api";
import { ORDER_STATUSES, PAYMENT_STATUSES, updateOrder } from "@/lib/admin-orders";

export const GET = adminRoute(async (req, { params }) => {
  const order = await db.order.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { product: { select: { id: true, slug: true } } } },
      events: { orderBy: { createdAt: "desc" } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!order) throw new HttpError(404, "Order not found");
  return ok({ order });
});

const schema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  note: z.string().max(1000).optional(),
  courier: z.string().max(80).optional(),
  trackingNumber: z.string().max(80).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const PATCH = adminRoute(async (req, { params, user }) => {
  const body = await readJson(req, schema);
  const order = await updateOrder(params.id, body, user);
  return ok({ order });
});
