import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute, readJson, revalidateCatalog, HttpError } from "@/lib/admin-api";
import { slugify } from "@/lib/utils";
import { collectionBase, replaceProducts } from "../schema";

const patchSchema = collectionBase.partial();

export const GET = adminRoute(async (req, { params }) => {
  const collection = await db.collection.findUnique({
    where: { id: params.id },
    include: { products: { orderBy: { position: "asc" }, include: { product: { select: { id: true, name: true, sku: true, price: true, status: true } } } } },
  });
  if (!collection) throw new HttpError(404, "Collection not found");
  return ok({ collection });
});

async function update(req, { params }) {
  const existing = await db.collection.findUnique({ where: { id: params.id } });
  if (!existing) throw new HttpError(404, "Collection not found");
  const raw = await readJson(req);
  const { productIds, ...data } = Object.fromEntries(Object.entries(patchSchema.parse(raw)).filter(([k]) => k in raw));
  if ("slug" in data && !data.slug) data.slug = slugify(data.name || existing.name);
  if (data.slug && data.slug !== existing.slug) {
    const clash = await db.collection.findUnique({ where: { slug: data.slug }, select: { id: true } });
    if (clash) throw new HttpError(409, `Slug "${data.slug}" is already used by another collection`);
  }
  const collection = await db.$transaction(async (tx) => {
    const c = await tx.collection.update({ where: { id: existing.id }, data });
    if (productIds) await replaceProducts(tx, c.id, productIds);
    return c;
  });
  revalidateCatalog();
  try { revalidatePath("/collections", "layout"); } catch {}
  return ok({ collection });
}

export const PUT = adminRoute(update);
export const PATCH = adminRoute(update);

export const DELETE = adminRoute(
  async (req, { params }) => {
    await db.collection.delete({ where: { id: params.id } });
    revalidateCatalog();
  try { revalidatePath("/collections", "layout"); } catch {}
    return ok({ ok: true });
  },
  { role: "ADMIN" }
);
