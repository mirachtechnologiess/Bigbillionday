import { adminRoute } from "@/lib/admin-api";
import { ok, HttpError, rateLimit } from "@/lib/api";
import { deleteSecret, readSecret, writeSecret } from "@/lib/secrets";
import { getNvidiaKey, invalidateNvidiaKey, testNvidiaKey, TEXT_MODEL, VISION_MODEL } from "@/lib/ai";

export const dynamic = "force-dynamic";

const KEY = "nvidia_api_key";
const KEY_FORMAT = /^nvapi-[A-Za-z0-9_-]{20,200}$/;

/** Status only — the key itself never leaves the server. */
async function status() {
  const stored = await readSecret(KEY);
  const active = await getNvidiaKey();
  return {
    configured: Boolean(active.value),
    source: active.source, // "admin" | "env" | null
    stored: stored ? { last4: stored.last4, updatedAt: stored.updatedAt, updatedBy: stored.updatedBy, unreadable: stored.unreadable } : null,
    envFallback: Boolean(process.env.NVIDIA_API_KEY),
    models: { text: TEXT_MODEL, vision: VISION_MODEL },
  };
}

export const GET = adminRoute(async () => ok(await status()));

/** Save a new key: { apiKey }. Verified against NVIDIA before it is stored. ADMIN only. */
export const PUT = adminRoute(
  async (req, { user }) => {
    rateLimit(`nvidia-key:${user.id}`, 10, 60_000);
    const { apiKey } = await req.json().catch(() => ({}));
    const key = String(apiKey || "").trim();
    if (!KEY_FORMAT.test(key)) throw new HttpError(422, 'That does not look like an NVIDIA key (it should start with "nvapi-")');
    const test = await testNvidiaKey(key);
    if (!test.ok) throw new HttpError(400, test.error);
    await writeSecret(KEY, key, user.email);
    invalidateNvidiaKey();
    return ok({ ...(await status()), test });
  },
  { role: "ADMIN" }
);

/** Test the key currently in use. */
export const POST = adminRoute(async (req, { user }) => {
  rateLimit(`nvidia-key:${user.id}`, 10, 60_000);
  const active = await getNvidiaKey();
  if (!active.value) throw new HttpError(400, "No NVIDIA key is configured yet");
  return ok({ test: await testNvidiaKey(active.value), source: active.source });
});

/** Remove the admin-set key (falls back to the server env key, if any). ADMIN only. */
export const DELETE = adminRoute(
  async () => {
    await deleteSecret(KEY);
    invalidateNvidiaKey();
    return ok(await status());
  },
  { role: "ADMIN" }
);
