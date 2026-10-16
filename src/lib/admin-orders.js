import "server-only";
import { db } from "./db";
import { HttpError, revalidateCatalog } from "./admin-api";
import { ORDER_FLOW, ORDER_STATUS_LABEL } from "./utils";

export const ORDER_STATUSES = [...ORDER_FLOW, "CANCELLED", "RETURN_REQUESTED", "RETURNED"];
export const FINAL_STATUSES = ["CANCELLED", "RETURNED"];
const RESTOCK_STATUSES = ["CANCELLED", "RETURNED"];
/** Statuses allowed in bulk moves (SHIPPED needs courier + tracking so it is per-order only). */
export const BULK_STATUSES = ["CONFIRMED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
export const PAYMENT_METHODS = ["COD", "RAZORPAY"];
export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"];

/**
 * Transition rules:
 *  - forward along ORDER_FLOW (skipping allowed) up to DELIVERED
 *  - any pre-delivery status → CANCELLED
 *  - DELIVERED → RETURN_REQUESTED → RETURNED (or back to DELIVERED if the return is declined)
 *  - CANCELLED / RETURNED are final
 */
export function allowedTransitions(from) {
  if (FINAL_STATUSES.includes(from)) return [];
  if (from === "DELIVERED") return ["RETURN_REQUESTED"];
  if (from === "RETURN_REQUESTED") return ["RETURNED", "DELIVERED"];
  const idx = ORDER_FLOW.indexOf(from);
  if (idx === -1) return [];
  return [...ORDER_FLOW.slice(idx + 1), "CANCELLED"];
}

export const canTransition = (from, to) => allowedTransitions(from).includes(to);

/** Build a Prisma where clause from list filters (object or URLSearchParams). */
export function orderWhere(params = {}, { withStatus = true } = {}) {
  const get = (k) => {
    const v = typeof params.get === "function" ? params.get(k) : params[k];
    return Array.isArray(v) ? v[0] : v || "";
  };
  const and = [];
  const status = get("status");
  if (withStatus && status && ORDER_STATUSES.includes(status)) and.push({ status });
  const pm = get("pm") || get("payment");
  if (PAYMENT_METHODS.includes(pm)) and.push({ paymentMethod: pm });
  const q = get("q").trim();
  if (q) {
    const digits = q.replace(/\D/g, "");
    and.push({
      OR: [
        { orderNumber: { contains: q.replace(/^#/, ""), mode: "insensitive" } },
        { shippingName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        ...(digits.length >= 4 ? [{ phone: { contains: digits.slice(-10) } }] : []),
      ],
    });
  }
  const from = get("from");
  const to = get("to");
  const created = {};
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) created.gte = new Date(`${from}T00:00:00+05:30`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) created.lte = new Date(`${to}T23:59:59.999+05:30`);
  if (created.gte || created.lte) and.push({ createdAt: created });
  return and.length ? { AND: and } : {};
}

/** Move one order (already loaded with items+product slug) to `to` inside a transaction client. */
async function transition(tx, order, to, { note, courier, trackingNumber } = {}) {
  if (to === order.status) return [];
  if (!canTransition(order.status, to)) {
    throw new HttpError(409, `Cannot move order ${order.orderNumber} from ${ORDER_STATUS_LABEL[order.status]} to ${ORDER_STATUS_LABEL[to] || to}`);
  }
  const data = { status: to };
  const c = (courier ?? order.courier ?? "").trim();
  const t = (trackingNumber ?? order.trackingNumber ?? "").trim();
  if (to === "SHIPPED") {
    if (!c || !t) throw new HttpError(422, "Courier and tracking number are required to mark an order shipped");
    data.courier = c;
    data.trackingNumber = t;
  } else {
    if (courier !== undefined) data.courier = c || null;
    if (trackingNumber !== undefined) data.trackingNumber = t || null;
  }
  if (to === "DELIVERED" && order.paymentMethod === "COD" && order.paymentStatus !== "PAID") data.paymentStatus = "PAID";

  // optimistic concurrency: only update if nobody moved it meanwhile
  const res = await tx.order.updateMany({ where: { id: order.id, status: order.status }, data });
  if (res.count === 0) throw new HttpError(409, `Order ${order.orderNumber} was changed by someone else — refresh and retry`);

  const slugs = [];
  if (RESTOCK_STATUSES.includes(to) && !RESTOCK_STATUSES.includes(order.status)) {
    for (const it of order.items) {
      if (!it.productId) continue;
      await tx.product.updateMany({
        where: { id: it.productId },
        data: { stock: { increment: it.quantity }, soldCount: { decrement: it.quantity } },
      });
      if (it.product?.slug) slugs.push(it.product.slug);
    }
  }
  const extra = [];
  if (to === "SHIPPED") extra.push(`${c} · ${t}`);
  if (data.paymentStatus === "PAID") extra.push("COD payment collected");
  const fullNote = [note?.trim(), ...extra].filter(Boolean).join(" — ") || null;
  await tx.orderEvent.create({ data: { orderId: order.id, status: to, note: fullNote } });
  return slugs;
}

const loadInclude = { items: { include: { product: { select: { slug: true } } } } };

/**
 * PATCH an order: { status, note, courier, trackingNumber, paymentStatus, notes }.
 * - status change → transition (+event)
 * - note alone → internal note event
 */
export async function updateOrder(id, body, actor) {
  const slugs = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: loadInclude });
    if (!order) throw new HttpError(404, "Order not found");
    const who = actor?.name ? ` (by ${actor.name})` : "";
    let touched = [];
    let current = order;

    if (body.status && body.status !== order.status) {
      touched = await transition(tx, order, body.status, body);
      current = await tx.order.findUnique({ where: { id }, include: loadInclude });
    } else {
      const data = {};
      if (body.courier !== undefined) data.courier = body.courier?.trim() || null;
      if (body.trackingNumber !== undefined) data.trackingNumber = body.trackingNumber?.trim() || null;
      if (Object.keys(data).length) {
        await tx.order.update({ where: { id }, data });
        await tx.orderEvent.create({ data: { orderId: id, status: order.status, note: `Shipping details updated: ${data.courier ?? order.courier ?? "—"} · ${data.trackingNumber ?? order.trackingNumber ?? "—"}${who}` } });
      }
      if (body.note?.trim()) {
        await tx.orderEvent.create({ data: { orderId: id, status: order.status, note: `Note${who}: ${body.note.trim()}` } });
      }
    }

    if (body.paymentStatus && body.paymentStatus !== current.paymentStatus) {
      await tx.order.update({ where: { id }, data: { paymentStatus: body.paymentStatus } });
      await tx.orderEvent.create({ data: { orderId: id, status: current.status, note: `Payment marked ${body.paymentStatus.toLowerCase()}${who}` } });
    }
    if (body.notes !== undefined) {
      await tx.order.update({ where: { id }, data: { notes: body.notes?.trim() || null } });
    }
    return touched;
  });
  if (slugs.length) revalidateCatalog(slugs);
  return db.order.findUnique({ where: { id } });
}

/** Bulk status move. Orders that cannot make the transition are skipped (not failed). */
export async function bulkUpdateStatus(ids, status, note) {
  if (!BULK_STATUSES.includes(status)) throw new HttpError(422, "This status cannot be applied in bulk");
  const orders = await db.order.findMany({ where: { id: { in: ids } }, include: loadInclude });
  let updated = 0;
  const skipped = [];
  const slugs = [];
  for (const order of orders) {
    if (!canTransition(order.status, status)) {
      skipped.push(order.orderNumber);
      continue;
    }
    try {
      const s = await db.$transaction((tx) => transition(tx, order, status, { note: note || "Bulk update" }));
      slugs.push(...s);
      updated++;
    } catch {
      skipped.push(order.orderNumber);
    }
  }
  if (slugs.length) revalidateCatalog([...new Set(slugs)]);
  return { updated, skipped };
}
