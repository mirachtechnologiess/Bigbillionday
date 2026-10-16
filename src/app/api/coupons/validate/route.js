import { z } from "zod";
import { handle, ok, rateLimit, clientIp } from "@/lib/api";
import { findValidCoupon, sanitizeCoupon } from "@/lib/orders";
import { couponDiscount } from "@/lib/pricing";

const schema = z.object({
  code: z.string().trim().min(1, "Enter a coupon code").max(40),
  subtotal: z.coerce.number().int().min(0).max(100_000_000),
});

/**
 * POST /api/coupons/validate { code, subtotal }
 * → 200 { coupon: {code,type,value,minOrder,maxDiscount,description}, discount } | 400 { error }
 */
export const POST = handle(async (req) => {
  rateLimit(`coupon:${clientIp(req)}`, 20, 60_000);
  const { code, subtotal } = schema.parse(await req.json());
  const c = await findValidCoupon(code, subtotal);
  return ok({ coupon: sanitizeCoupon(c), discount: couponDiscount(c, subtotal) });
});
