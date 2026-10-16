import { z } from "zod";
import { ok } from "@/lib/api";
import { adminRoute, readJson } from "@/lib/admin-api";
import { BULK_STATUSES, bulkUpdateStatus } from "@/lib/admin-orders";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  status: z.enum(BULK_STATUSES),
  note: z.string().max(500).optional(),
});

export const POST = adminRoute(async (req) => {
  const { ids, status, note } = await readJson(req, schema);
  return ok(await bulkUpdateStatus(ids, status, note));
});
