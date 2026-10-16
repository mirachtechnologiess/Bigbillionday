import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute, readJson } from "@/lib/admin-api";
import { couponBase, assertCouponRules, assertCodeFree } from "./schema";

export const GET = adminRoute(async () => {
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return ok({ coupons });
});

export const POST = adminRoute(async (req) => {
  const data = await readJson(req, couponBase);
  assertCouponRules(data);
  await assertCodeFree(db, data.code);
  const coupon = await db.coupon.create({ data });
  return ok({ coupon }, { status: 201 });
});
