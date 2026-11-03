import { z } from "zod";
import { ok } from "@/lib/api";
import { adminRoute, readJson } from "@/lib/admin-api";
import { db } from "@/lib/db";
import { BULK_STATUSES, bulkUpdateStatus } from "@/lib/admin-orders";
import { cancelShipment } from "@/lib/shiprocket";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  status: z.enum(BULK_STATUSES),
  note: z.string().max(500).optional(),
});

export const POST = adminRoute(async (req, { user }) => {
  const { ids, status, note } = await readJson(req, schema);
  if (status !== "CANCELLED") return ok(await bulkUpdateStatus(ids, status, note));
  // Cancel booked courier shipments first; orders whose shipment can't be cancelled are skipped.
  const booked = await db.shipment.findMany({
    where: { orderId: { in: ids }, awb: { not: null }, cancelledAt: null, closed: false },
    select: { orderId: true, order: { select: { orderNumber: true } } },
  });
  const blocked = [];
  for (const sh of booked) {
    try {
      await cancelShipment(sh.orderId, user);
    } catch {
      blocked.push(sh);
    }
  }
  const r = await bulkUpdateStatus(ids.filter((id) => !blocked.some((b) => b.orderId === id)), status, note);
  return ok({ ...r, skipped: [...r.skipped, ...blocked.map((b) => b.order.orderNumber)] });
});
