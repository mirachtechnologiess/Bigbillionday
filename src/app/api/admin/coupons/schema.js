import { z } from "zod";
import { HttpError } from "@/lib/admin-api";

const blankToNull = (v) => (v === undefined ? undefined : v === "" || v === null ? null : v);

const optInt = z.preprocess(blankToNull, z.coerce.number().int().min(0).max(10_000_000).nullable().optional());
const optDate = z.preprocess(blankToNull, z.coerce.date().nullable().optional());

export const couponBase = z.object({
  code: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9_-]{3,30}$/, "Code must be 3–30 chars: A–Z, 0–9, _ or -")),
  description: z.preprocess((v) => (v === undefined ? undefined : String(v ?? "").trim() || null), z.string().max(200).nullable().optional()),
  type: z.enum(["PERCENT", "FLAT"]),
  value: z.coerce.number().int().min(1, "Value must be at least 1").max(1_000_000),
  minOrder: z.coerce.number().int().min(0).max(10_000_000).default(0),
  maxDiscount: optInt,
  usageLimit: optInt,
  startsAt: optDate,
  endsAt: optDate,
  isActive: z.boolean().default(true),
});

/** Cross-field rules, applied to the final (merged) record. */
export function assertCouponRules(c) {
  if (c.type === "PERCENT" && (c.value < 1 || c.value > 90)) throw new HttpError(422, "Percentage must be between 1 and 90");
  if (c.startsAt && c.endsAt && new Date(c.endsAt) <= new Date(c.startsAt)) throw new HttpError(422, "End date must be after the start date");
  if (c.usageLimit === 0) throw new HttpError(422, "Usage limit must be at least 1 (leave empty for unlimited)");
}

export async function assertCodeFree(db, code, exceptId) {
  const hit = await db.coupon.findUnique({ where: { code }, select: { id: true } });
  if (hit && hit.id !== exceptId) throw new HttpError(409, `Coupon code "${code}" already exists — pick another code`);
}
