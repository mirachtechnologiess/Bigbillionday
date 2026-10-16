import { z } from "zod";
import { ok } from "@/lib/api";
import { adminRoute, readJson, revalidateLayout, HttpError } from "@/lib/admin-api";
import { DEFAULT_SETTINGS, getSettings, saveSettingGroup } from "@/lib/settings";

export const GET = adminRoute(async () => ok({ settings: await getSettings() }));

const schema = z.object({
  key: z.string().refine((k) => Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, k), "Unknown settings group"),
  value: z.record(z.string(), z.unknown()),
});

function coerce(group, field, v) {
  const def = DEFAULT_SETTINGS[group][field];
  if (typeof def === "boolean") {
    if (typeof v === "boolean") return v;
    if (v === "true" || v === 1 || v === "1") return true;
    if (v === "false" || v === 0 || v === "0" || v === "" || v == null) return false;
    throw new HttpError(422, `${field} must be true or false`);
  }
  if (typeof def === "number") {
    const n = typeof v === "number" ? v : Number(String(v ?? "").trim() || NaN);
    if (!Number.isFinite(n) || n < 0 || n > 1e9) throw new HttpError(422, `${field} must be a non-negative number`);
    return Math.round(n);
  }
  const s = v == null ? "" : String(v);
  if (s.length > 5000) throw new HttpError(422, `${field} is too long`);
  return s.trim();
}

export const PUT = adminRoute(
  async (req) => {
    const { key, value } = await readJson(req, schema);
    const defaults = DEFAULT_SETTINGS[key];
    const unknown = Object.keys(value).filter((k) => !Object.prototype.hasOwnProperty.call(defaults, k));
    if (unknown.length) throw new HttpError(422, `Unknown setting${unknown.length > 1 ? "s" : ""} for ${key}: ${unknown.join(", ")}`);

    const current = (await getSettings())[key] || defaults;
    const next = {};
    for (const field of Object.keys(defaults)) next[field] = field in value ? coerce(key, field, value[field]) : current[field] ?? defaults[field];

    if (key === "payment" && next.razorpayEnabled && !(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)) {
      throw new HttpError(422, "Razorpay can't be enabled until RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are configured on the server");
    }
    if (key === "payment" && !next.codEnabled && !next.razorpayEnabled) throw new HttpError(422, "At least one payment method must stay enabled");

    await saveSettingGroup(key, next);
    revalidateLayout();
    return ok({ key, value: next });
  },
  { role: "ADMIN" }
);
