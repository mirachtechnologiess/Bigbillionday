import { z } from "zod";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute, readJson, revalidateCatalog, revalidateLayout } from "@/lib/admin-api";

const schema = z.object({ ids: z.array(z.string().min(1)).min(1).max(1000) });

/** Body { ids: [ordered] } → sortOrder = index. */
export const POST = adminRoute(async (req) => {
  const { ids } = await readJson(req, schema);
  await db.$transaction(ids.map((id, i) => db.banner.update({ where: { id }, data: { sortOrder: i } })));
  revalidateCatalog();
  revalidateLayout();
  return ok({ ok: true });
});
