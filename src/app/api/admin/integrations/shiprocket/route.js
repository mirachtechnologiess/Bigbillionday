import { z } from "zod";
import { adminRoute, readJson } from "@/lib/admin-api";
import { ok, rateLimit } from "@/lib/api";
import {
  credentialStatus, getPickupLocations, getShipConfig, getWalletBalance, getWebhookToken, removeCredentials, rotateWebhookToken,
  saveCredentials, saveShipConfig,
} from "@/lib/shiprocket";

export const dynamic = "force-dynamic";

const webhookUrl = () => `${(process.env.NEXT_PUBLIC_SITE_URL || "https://premiumshopy.com").replace(/\/$/, "")}/api/hooks/courier-update`;

/** Connection status, settings, pickup addresses and wallet. Credentials never leave the server. */
async function status({ live = true, isAdmin = false } = {}) {
  const account = await credentialStatus();
  const out = {
    connected: Boolean(account && !account.unreadable),
    account,
    config: await getShipConfig(),
    webhook: { url: webhookUrl(), token: isAdmin ? await getWebhookToken() : null },
    pickups: [],
    wallet: null,
    error: null,
  };
  if (out.connected && live) {
    try {
      [out.pickups, out.wallet] = await Promise.all([getPickupLocations(), getWalletBalance().catch(() => null)]);
    } catch (e) {
      out.error = e.message;
    }
  }
  return out;
}

export const GET = adminRoute(async (req, { user }) => ok(await status({ isAdmin: user.role === "ADMIN" })));

/** Connect: { email, password } of a Shiprocket API user — verified by logging in before it is stored. */
export const PUT = adminRoute(
  async (req, { user }) => {
    rateLimit(`shiprocket-login:${user.id}`, 6, 60_000);
    const { email, password } = await readJson(req, z.object({ email: z.string().trim().email(), password: z.string().min(1).max(200) }));
    await saveCredentials(email, password, user.email);
    if (!(await getWebhookToken())) await rotateWebhookToken(user.email);
    return ok(await status({ isAdmin: true }));
  },
  { role: "ADMIN" }
);

const configSchema = z.object({
  pickupLocation: z.string().trim().max(120).optional(),
  pickupPincode: z.string().trim().regex(/^\d{6}$/, "Pincode must be 6 digits").optional(),
  weightKg: z.coerce.number().min(0.05).max(50).optional(),
  lengthCm: z.coerce.number().int().min(1).max(200).optional(),
  breadthCm: z.coerce.number().int().min(1).max(200).optional(),
  heightCm: z.coerce.number().int().min(1).max(200).optional(),
  autoPickup: z.boolean().optional(),
  autoStatus: z.boolean().optional(),
});

/** Save pickup address / package defaults / automation toggles. */
export const PATCH = adminRoute(
  async (req) => {
    const patch = await readJson(req, configSchema);
    await saveShipConfig(patch);
    return ok(await status({ live: false, isAdmin: true }));
  },
  { role: "ADMIN" }
);

/** { action: "rotate-webhook" } → new webhook security token. */
export const POST = adminRoute(
  async (req, { user }) => {
    await readJson(req, z.object({ action: z.literal("rotate-webhook") }));
    await rotateWebhookToken(user.email);
    return ok(await status({ live: false, isAdmin: true }));
  },
  { role: "ADMIN" }
);

/** Disconnect (removes the stored API user). */
export const DELETE = adminRoute(
  async () => {
    await removeCredentials();
    return ok(await status({ live: false, isAdmin: true }));
  },
  { role: "ADMIN" }
);
