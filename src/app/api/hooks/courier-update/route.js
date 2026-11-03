import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/api";
import { handleWebhook, verifyWebhookToken } from "@/lib/shiprocket";

export const dynamic = "force-dynamic";

/**
 * Shiprocket tracking webhook (Shiprocket → Settings → API → Webhooks).
 * The URL must not contain "shiprocket", "sr" or "kr", hence the neutral path.
 * Shiprocket sends the security token as the x-api-key header and expects HTTP 200.
 */
export async function POST(req) {
  try {
    rateLimit(`courier-hook:${clientIp(req)}`, 300, 60_000);
  } catch {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  if (!(await verifyWebhookToken(req.headers.get("x-api-key")))) {
    return NextResponse.json({ ok: false, error: "invalid token" }, { status: 401 });
  }
  let payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: true, ignored: "not json" });
  }
  try {
    const matched = await handleWebhook(payload);
    return NextResponse.json({ ok: true, matched });
  } catch (e) {
    console.error("[courier-hook]", e);
    // still 200: a failed update is picked up by the periodic sync
    return NextResponse.json({ ok: true, matched: false });
  }
}
