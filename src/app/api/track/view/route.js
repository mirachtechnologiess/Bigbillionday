import { db } from "@/lib/db";
import { handle, ok, rateLimit, clientIp } from "@/lib/api";

/** POST /api/track/view { productId } — fire-and-forget product view counter (sent via sendBeacon from the PDP). */
export const POST = handle(async (req) => {
  let body = {};
  try {
    body = JSON.parse(await req.text());
  } catch {}
  const productId = typeof body.productId === "string" ? body.productId.slice(0, 40) : "";
  if (!productId) return ok({ ok: false });
  const ip = clientIp(req);
  rateLimit(`view:${ip}`, 60, 60_000);
  try {
    rateLimit(`view:${ip}:${productId}`, 1, 30 * 60_000);
  } catch {
    return ok({ ok: true, counted: false });
  }
  await db.product.updateMany({ where: { id: productId, status: "ACTIVE" }, data: { viewCount: { increment: 1 } } });
  return ok({ ok: true, counted: true });
});
