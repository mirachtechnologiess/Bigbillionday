import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-api";

export const DELETE = adminRoute(
  async (req, { params }) => {
    await db.newsletter.delete({ where: { id: params.id } });
    return ok({ ok: true });
  },
  { role: "ADMIN" }
);
