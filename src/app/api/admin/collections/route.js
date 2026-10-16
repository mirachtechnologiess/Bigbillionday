import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute, readJson, revalidateCatalog, HttpError } from "@/lib/admin-api";
import { slugify } from "@/lib/utils";
import { collectionBase, replaceProducts } from "./schema";

export const GET = adminRoute(async () => {
  const collections = await db.collection.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  return ok({ collections });
});

export const POST = adminRoute(async (req) => {
  const { productIds, ...data } = await readJson(req, collectionBase);
  data.slug = data.slug || slugify(data.name);
  if (!data.slug) throw new HttpError(422, "Could not derive a slug from the name");
  if (await db.collection.findUnique({ where: { slug: data.slug }, select: { id: true } })) throw new HttpError(409, `Slug "${data.slug}" is already used by another collection`);
  if (data.sortOrder === undefined) {
    const last = await db.collection.aggregate({ _max: { sortOrder: true } });
    data.sortOrder = (last._max.sortOrder ?? -1) + 1;
  }
  const collection = await db.$transaction(async (tx) => {
    const c = await tx.collection.create({ data });
    if (productIds?.length) await replaceProducts(tx, c.id, productIds);
    return c;
  });
  revalidateCatalog();
  try { revalidatePath("/collections", "layout"); } catch {}
  return ok({ collection }, { status: 201 });
});
