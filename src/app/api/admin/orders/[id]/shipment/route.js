import { z } from "zod";
import { db } from "@/lib/db";
import { ok, rateLimit } from "@/lib/api";
import { adminRoute, readJson, HttpError } from "@/lib/admin-api";
import {
  cancelShipment, createShipment, getShipConfig, makeLabel, makeManifest, quoteCouriers, refreshTracking, requestPickup, suggestedPackage,
} from "@/lib/shiprocket";

export const dynamic = "force-dynamic";

const loadOrder = (id) => db.order.findUnique({ where: { id }, include: { items: true, shipment: true } });

/** Shipment + suggested package for the "Ship with Shiprocket" dialog. */
export const GET = adminRoute(async (req, { params }) => {
  const order = await loadOrder(params.id);
  if (!order) throw new HttpError(404, "Order not found");
  const cfg = await getShipConfig();
  return ok({
    shipment: order.shipment,
    package: await suggestedPackage(order),
    ready: Boolean(cfg.pickupLocation && cfg.pickupPincode),
    pickup: { name: cfg.pickupLocation, pincode: cfg.pickupPincode },
  });
});

const pkg = z.object({ weightKg: z.coerce.number(), lengthCm: z.coerce.number(), breadthCm: z.coerce.number(), heightCm: z.coerce.number() }).partial();
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("quote"), pkg: pkg.optional() }),
  z.object({ action: z.literal("create"), courierId: z.coerce.number().int().positive(), rate: z.coerce.number().optional(), pkg: pkg.optional() }),
  z.object({ action: z.literal("refresh") }),
  z.object({ action: z.literal("pickup") }),
  z.object({ action: z.literal("label") }),
  z.object({ action: z.literal("manifest") }),
  z.object({ action: z.literal("cancel") }),
]);

/**
 * { action: "quote", pkg }               → couriers for this order
 * { action: "create", courierId, pkg }    → book: Shiprocket order + AWB + pickup + label
 * { action: "refresh" | "pickup" | "label" | "manifest" | "cancel" }
 */
export const POST = adminRoute(async (req, { params, user }) => {
  const body = await readJson(req, schema);
  rateLimit(`shiprocket:${user.id}`, 40, 60_000);
  const order = await loadOrder(params.id);
  if (!order) throw new HttpError(404, "Order not found");
  const sh = order.shipment;
  const needAwb = () => {
    if (!sh?.awb || sh.cancelledAt) throw new HttpError(400, "Book the shipment first");
    return sh;
  };

  switch (body.action) {
    case "quote":
      return ok(await quoteCouriers(order, body.pkg));
    case "create":
      return ok({ shipment: await createShipment(order.id, body, user) });
    case "refresh": {
      const r = await refreshTracking(needAwb());
      return ok({ ...r, shipment: await db.shipment.findUnique({ where: { id: sh.id } }) });
    }
    case "pickup":
      return ok({ shipment: await requestPickup(needAwb()) });
    case "label":
      return ok({ shipment: await makeLabel(needAwb()) });
    case "manifest":
      return ok({ shipment: await makeManifest(needAwb()) });
    case "cancel":
      await cancelShipment(order.id, user);
      return ok({ shipment: await db.shipment.findUnique({ where: { orderId: order.id } }) });
    default:
      throw new HttpError(400, "Unknown action");
  }
});
