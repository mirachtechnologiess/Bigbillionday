import { z } from "zod";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute, readJson, revalidateCatalog, HttpError } from "@/lib/admin-api";

const schema = z
  .object({
    id: z.string().min(1),
    stock: z.number().int().min(0).max(1_000_000).optional(),
    delta: z.number().int().min(-1_000_000).max(1_000_000).optional(),
    lowStockAt: z.number().int().min(0).max(10_000).optional(),
  })
  .refine((b) => b.stock !== undefined || b.delta !== undefined || b.lowStockAt !== undefined, "Provide stock, delta or lowStockAt");

export const PATCH = adminRoute(async (req) => {
  const b = await readJson(req, schema);
  const product = await db.$transaction(async (tx) => {
    const p = await tx.product.findUnique({ where: { id: b.id }, select: { id: true, stock: true } });
    if (!p) throw new HttpError(404, "Product not found");
    const data = {};
    if (b.stock !== undefined) data.stock = b.stock;
    else if (b.delta !== undefined) data.stock = Math.max(0, p.stock + b.delta);
    if (b.lowStockAt !== undefined) data.lowStockAt = b.lowStockAt;
    return tx.product.update({ where: { id: p.id }, data, select: { id: true, slug: true, stock: true, lowStockAt: true } });
  });
  revalidateCatalog([product.slug]);
  return ok({ product });
});
