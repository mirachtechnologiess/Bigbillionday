import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute, readJson, revalidateCatalog, revalidateLayout } from "@/lib/admin-api";
import { assertBannerData, withBannerProducts } from "@/lib/admin-banners";
import { bannerBase } from "./schema";

export const GET = adminRoute(async () => {
  const rows = await db.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  return ok({ banners: await withBannerProducts(rows) });
});

export const POST = adminRoute(async (req) => {
  const data = await readJson(req, bannerBase);
  await assertBannerData(data);
  if (data.sortOrder === undefined) {
    const last = await db.banner.aggregate({ _max: { sortOrder: true } });
    data.sortOrder = (last._max.sortOrder ?? -1) + 1;
  }
  const row = await db.banner.create({ data });
  revalidateCatalog();
  revalidateLayout();
  const [banner] = await withBannerProducts(row);
  return ok({ banner }, { status: 201 });
});
