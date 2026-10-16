import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute, readJson, revalidateCatalog, revalidateLayout, HttpError } from "@/lib/admin-api";
import { deleteImage } from "@/lib/storage";
import { assertBannerData, withBannerProducts } from "@/lib/admin-banners";
import { bannerBase } from "../schema";

const patchSchema = bannerBase.partial();

async function update(req, { params }) {
  const raw = await readJson(req);
  const data = Object.fromEntries(Object.entries(patchSchema.parse(raw)).filter(([k]) => k in raw));
  const existing = await db.banner.findUnique({ where: { id: params.id } });
  if (!existing) throw new HttpError(404, "Banner not found");
  await assertBannerData(data, existing);
  const row = await db.banner.update({ where: { id: params.id }, data });
  revalidateCatalog();
  revalidateLayout();
  const [banner] = await withBannerProducts(row);
  return ok({ banner });
}

export const PATCH = adminRoute(update);
export const PUT = adminRoute(update);

export const DELETE = adminRoute(
  async (req, { params }) => {
    const banner = await db.banner.findUnique({ where: { id: params.id } });
    if (!banner) throw new HttpError(404, "Banner not found");
    await db.banner.delete({ where: { id: banner.id } });
    if (banner.image) await deleteImage(banner.image);
    revalidateCatalog();
    revalidateLayout();
    return ok({ ok: true });
  },
  { role: "ADMIN" }
);
