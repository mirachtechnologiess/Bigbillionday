import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute, readJson, revalidateCatalog, HttpError } from "@/lib/admin-api";
import { slugify } from "@/lib/utils";
import { categoryBase, assertValidParent } from "./schema";

export const GET = adminRoute(async () => {
  const categories = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true, children: true } } } });
  return ok({ categories });
});

export const POST = adminRoute(async (req) => {
  const data = await readJson(req, categoryBase);
  data.slug = data.slug || slugify(data.name);
  if (!data.slug) throw new HttpError(422, "Could not derive a slug from the name");
  await assertValidParent(db, data.parentId);
  const clash = await db.category.findFirst({ where: { OR: [{ name: { equals: data.name, mode: "insensitive" } }, { slug: data.slug }] }, select: { id: true } });
  if (clash) throw new HttpError(409, "A category with this name or slug already exists");
  if (data.sortOrder === undefined) {
    const last = await db.category.aggregate({ where: { parentId: data.parentId ?? null }, _max: { sortOrder: true } });
    data.sortOrder = (last._max.sortOrder ?? -1) + 1;
  }
  const category = await db.category.create({ data });
  revalidateCatalog();
  try { revalidatePath("/category", "layout"); } catch {}
  return ok({ category }, { status: 201 });
});
