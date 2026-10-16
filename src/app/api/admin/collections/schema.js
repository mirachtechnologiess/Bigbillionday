import { z } from "zod";
import { slugify } from "@/lib/utils";

const optText = (max) => z.preprocess((v) => (v === undefined ? undefined : String(v ?? "").trim() || null), z.string().max(max).nullable().optional());

export const collectionBase = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  slug: z.preprocess((v) => (v === undefined ? undefined : slugify(String(v ?? ""))), z.string().max(90).optional()),
  description: optText(4000),
  image: optText(500),
  isActive: z.boolean().optional(),
  showOnHome: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(-100000).max(100000).optional(),
  productIds: z.array(z.string().min(1)).max(500).optional(),
});

/** Replace a collection's product rows with position = index. Must run inside an interactive transaction. */
export async function replaceProducts(tx, collectionId, productIds) {
  const wanted = [...new Set(productIds)];
  const existing = new Set((await tx.product.findMany({ where: { id: { in: wanted } }, select: { id: true } })).map((p) => p.id));
  const ids = wanted.filter((id) => existing.has(id));
  await tx.collectionProduct.deleteMany({ where: { collectionId } });
  if (ids.length) await tx.collectionProduct.createMany({ data: ids.map((productId, position) => ({ collectionId, productId, position })) });
}
