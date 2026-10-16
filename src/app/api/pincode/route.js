import { handle, ok, fail, rateLimit, clientIp } from "@/lib/api";
import { getSettings } from "@/lib/settings";

function addBusinessDays(from, days) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) added++; // skip Sundays
  }
  return d;
}

const fmt = (d) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

/**
 * GET /api/pincode?code=560001
 * → { pincode, serviceable, eta, etaFrom, etaTo, days, cod, message }
 * Uses settings.shipping.serviceablePincodes (comma separated prefixes; empty = all India).
 */
export const GET = handle(async (req) => {
  rateLimit(`pincode:${clientIp(req)}`, 40, 60_000);
  const code = (new URL(req.url).searchParams.get("code") || "").trim();
  if (!/^[1-9]\d{5}$/.test(code)) return fail("Enter a valid 6-digit pincode", 422);

  const { shipping, payment } = await getSettings();
  const prefixes = String(shipping.serviceablePincodes || "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const serviceable = prefixes.length === 0 || prefixes.some((p) => code.startsWith(p));

  const [min, max] = String(shipping.etaDays || "3-7")
    .split("-")
    .map((n) => parseInt(n, 10))
    .filter((n) => Number.isFinite(n));
  const lo = min || 3;
  const hi = max || lo;
  const now = new Date();
  const from = addBusinessDays(now, lo);
  const to = addBusinessDays(now, hi);

  return ok(
    {
      pincode: code,
      serviceable,
      eta: serviceable ? (lo === hi ? fmt(from) : `${fmt(from)} – ${fmt(to)}`) : null,
      etaFrom: serviceable ? from.toISOString() : null,
      etaTo: serviceable ? to.toISOString() : null,
      days: serviceable ? `${lo}-${hi}` : null,
      cod: serviceable && payment.codEnabled !== false,
      message: serviceable ? null : "Sorry, we don't deliver to this pincode yet.",
    },
    { headers: { "Cache-Control": "private, max-age=600" } }
  );
});
