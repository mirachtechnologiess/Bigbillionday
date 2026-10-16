import { z } from "zod";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute, readJson, HttpError } from "@/lib/admin-api";
import { recomputeRating } from "@/lib/admin-reviews";

const schema = z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]) });

export const PATCH = adminRoute(async (req, { params }) => {
  const { status } = await readJson(req, schema);
  const review = await db.review.update({ where: { id: params.id }, data: { status }, select: { id: true, status: true, productId: true } });
  await recomputeRating([review.productId]);
  return ok({ review });
});

export const DELETE = adminRoute(
  async (req, { params }) => {
    const review = await db.review.findUnique({ where: { id: params.id }, select: { id: true, productId: true } });
    if (!review) throw new HttpError(404, "Review not found");
    await db.review.delete({ where: { id: review.id } });
    await recomputeRating([review.productId]);
    return ok({ ok: true });
  },
  { role: "ADMIN" }
);
