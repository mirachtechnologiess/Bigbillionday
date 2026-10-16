import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute, readJson, revalidateCatalog, HttpError } from "@/lib/admin-api";
import { slugify } from "@/lib/utils";
import { brandBase } from "./schema";

export const GET = adminRoute(async () => {
  const brands = await db.brand.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  return ok({ brands });
});

export const POST = adminRoute(async (req) => {
  const data = await readJson(req, brandBase);
  data.slug = data.slug || slugify(data.name);
  if (!data.slug) throw new HttpError(422, "Could not derive a slug from the name");
  const clash = await db.brand.findFirst({ where: { OR: [{ name: { equals: data.name, mode: "insensitive" } }, { slug: data.slug }] }, select: { id: true } });
  if (clash) throw new HttpError(409, "A brand with this name or slug already exists");
  if (data.sortOrder === undefined) {
    const last = await db.brand.aggregate({ _max: { sortOrder: true } });
    data.sortOrder = (last._max.sortOrder ?? -1) + 1;
  }
  const brand = await db.brand.create({ data });
  revalidateCatalog();
  try { revalidatePath("/brands", "layout"); } catch {}
  return ok({ brand }, { status: 201 });
});
