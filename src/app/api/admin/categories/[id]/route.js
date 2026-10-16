import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute, readJson, revalidateCatalog, HttpError } from "@/lib/admin-api";
import { deleteImage } from "@/lib/storage";
import { slugify } from "@/lib/utils";
import { categoryBase, assertValidParent } from "../schema";

const patchSchema = categoryBase.partial();

export const PATCH = adminRoute(async (req, { params }) => {
  const existing = await db.category.findUnique({ where: { id: params.id } });
  if (!existing) throw new HttpError(404, "Category not found");
  const raw = await readJson(req);
  const data = Object.fromEntries(Object.entries(patchSchema.parse(raw)).filter(([k]) => k in raw));
  if ("slug" in data && !data.slug) data.slug = slugify(data.name || existing.name);
  if ("parentId" in data) await assertValidParent(db, data.parentId, existing.id);
  if (data.name || data.slug) {
    const clash = await db.category.findFirst({
      where: { id: { not: existing.id }, OR: [...(data.name ? [{ name: { equals: data.name, mode: "insensitive" } }] : []), ...(data.slug ? [{ slug: data.slug }] : [])] },
      select: { id: true },
    });
    if (clash) throw new HttpError(409, "Another category already uses this name or slug");
  }
  const category = await db.category.update({ where: { id: existing.id }, data });
  revalidateCatalog();
  try { revalidatePath("/category", "layout"); } catch {}
  return ok({ category });
});

export const PUT = PATCH;

export const DELETE = adminRoute(
  async (req, { params }) => {
    const cat = await db.category.findUnique({ where: { id: params.id }, include: { _count: { select: { products: true, children: true } } } });
    if (!cat) throw new HttpError(404, "Category not found");
    if (cat._count.children > 0) throw new HttpError(409, `${cat.name} has ${cat._count.children} sub-categor${cat._count.children === 1 ? "y" : "ies"}. Move or delete them first.`);
    if (cat._count.products > 0) throw new HttpError(409, `${cat.name} still has ${cat._count.products} product${cat._count.products === 1 ? "" : "s"}. Reassign them to another category first.`);
    await db.category.delete({ where: { id: cat.id } });
    if (cat.image) await deleteImage(cat.image);
    revalidateCatalog();
  try { revalidatePath("/category", "layout"); } catch {}
    return ok({ ok: true });
  },
  { role: "ADMIN" }
);
