import { ok, rateLimit } from "@/lib/api";
import { adminRoute } from "@/lib/admin-api";
import { syncOpenShipments } from "@/lib/shiprocket";

export const dynamic = "force-dynamic";

/** Refresh tracking for every open shipment now. */
export const POST = adminRoute(async (req, { user }) => {
  rateLimit(`shiprocket-sync:${user.id}`, 4, 60_000);
  return ok(await syncOpenShipments());
});
