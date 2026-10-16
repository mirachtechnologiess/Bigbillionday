import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute, readJson, revalidateCatalog, HttpError } from "@/lib/admin-api";
import { deleteImage } from "@/lib/storage";
import { slugify } from "@/lib/utils";
import { brandBase } from "../schema";

const patchSchema = brandBase.partial();

export const PATCH = adminRoute(async (req, { params }) => {
  const existing = await db.brand.findUnique({ where: { id: params.id } });
  if (!existing) throw new HttpError(404, "Brand not found");
  const raw = await readJson(req);
  const data = Object.fromEntries(Object.entries(patchSchema.parse(raw)).filter(([k]) => k in raw));
  if ("slug" in data && !data.slug) data.slug = slugify(data.name || existing.name);
  if (data.name || data.slug) {
    const clash = await db.brand.findFirst({
      where: { id: { not: existing.id }, OR: [...(data.name ? [{ name: { equals: data.name, mode: "insensitive" } }] : []), ...(data.slug ? [{ slug: data.slug }] : [])] },
      select: { id: true },
    });
    if (clash) throw new HttpError(409, "Another brand already uses this name or slug");
  }
  const brand = await db.brand.update({ where: { id: existing.id }, data });
  revalidateCatalog();
  try { revalidatePath("/brands", "layout"); } catch {}
  return ok({ brand });
});

export const PUT = PATCH;

export const DELETE = adminRoute(
  async (req, { params }) => {
    const brand = await db.brand.findUnique({ where: { id: params.id }, include: { _count: { select: { products: true } } } });
    if (!brand) throw new HttpError(404, "Brand not found");
    const n = brand._count.products;
    if (n > 0) throw new HttpError(409, `${brand.name} still has ${n} product${n === 1 ? "" : "s"}. Reassign or delete them before deleting the brand.`);
    await db.brand.delete({ where: { id: brand.id } });
    if (brand.logo) await deleteImage(brand.logo);
    revalidateCatalog();
  try { revalidatePath("/brands", "layout"); } catch {}
    return ok({ ok: true });
  },
  { role: "ADMIN" }
);
