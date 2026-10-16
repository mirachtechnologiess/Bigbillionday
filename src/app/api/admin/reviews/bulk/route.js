import { z } from "zod";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute, assertAdminRole, readJson } from "@/lib/admin-api";
import { recomputeRating } from "@/lib/admin-reviews";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  action: z.enum(["APPROVED", "REJECTED", "PENDING", "DELETE"]),
});

export const POST = adminRoute(async (req, { user }) => {
  const { ids, action } = await readJson(req, schema);
  if (action === "DELETE") assertAdminRole(user);
  const rows = await db.review.findMany({ where: { id: { in: ids } }, select: { productId: true } });
  const { count } =
    action === "DELETE"
      ? await db.review.deleteMany({ where: { id: { in: ids } } })
      : await db.review.updateMany({ where: { id: { in: ids } }, data: { status: action } });
  await recomputeRating(rows.map((r) => r.productId));
  return ok({ count });
});
