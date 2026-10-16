import { z } from "zod";
import { slugify } from "@/lib/utils";
import { HttpError } from "@/lib/admin-api";

const optText = (max) => z.preprocess((v) => (v === undefined ? undefined : String(v ?? "").trim() || null), z.string().max(max).nullable().optional());

export const categoryBase = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  slug: z.preprocess((v) => (v === undefined ? undefined : slugify(String(v ?? ""))), z.string().max(90).optional()),
  parentId: z.preprocess((v) => (v === undefined ? undefined : v || null), z.string().nullable().optional()),
  image: optText(500),
  description: optText(4000),
  sortOrder: z.coerce.number().int().min(-100000).max(100000).optional(),
  seoTitle: optText(70),
  seoDesc: optText(170),
});

/** Throws unless parentId exists and is not `selfId` or one of its descendants. */
export async function assertValidParent(db, parentId, selfId) {
  if (!parentId) return;
  const all = await db.category.findMany({ select: { id: true, parentId: true } });
  if (!all.some((c) => c.id === parentId)) throw new HttpError(422, "Parent category not found");
  if (!selfId) return;
  if (parentId === selfId) throw new HttpError(422, "A category cannot be its own parent");
  const byParent = new Map();
  for (const c of all) byParent.set(c.parentId, [...(byParent.get(c.parentId) || []), c.id]);
  const stack = [...(byParent.get(selfId) || [])];
  while (stack.length) {
    const id = stack.pop();
    if (id === parentId) throw new HttpError(422, "A category cannot be moved under one of its own sub-categories");
    stack.push(...(byParent.get(id) || []));
  }
}
