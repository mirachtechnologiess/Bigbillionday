import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute, readJson, HttpError } from "@/lib/admin-api";
import { couponBase, assertCouponRules, assertCodeFree } from "../schema";

const patchSchema = couponBase.partial();

export const PATCH = adminRoute(async (req, { params }) => {
  const existing = await db.coupon.findUnique({ where: { id: params.id } });
  if (!existing) throw new HttpError(404, "Coupon not found");
  const raw = await readJson(req);
  const data = Object.fromEntries(Object.entries(patchSchema.parse(raw)).filter(([k]) => k in raw));
  assertCouponRules({ ...existing, ...data });
  if (data.code && data.code !== existing.code) await assertCodeFree(db, data.code, existing.id);
  const coupon = await db.coupon.update({ where: { id: existing.id }, data });
  return ok({ coupon });
});

export const PUT = PATCH;

export const DELETE = adminRoute(
  async (req, { params }) => {
    await db.coupon.delete({ where: { id: params.id } });
    return ok({ ok: true });
  },
  { role: "ADMIN" }
);
