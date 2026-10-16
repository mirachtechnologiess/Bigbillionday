import { z } from "zod";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute, readJson } from "@/lib/admin-api";

const schema = z.object({ isRead: z.boolean() });

export const PATCH = adminRoute(async (req, { params }) => {
  const { isRead } = await readJson(req, schema);
  const message = await db.contactMessage.update({ where: { id: params.id }, data: { isRead } });
  return ok({ message });
});

export const DELETE = adminRoute(
  async (req, { params }) => {
    await db.contactMessage.delete({ where: { id: params.id } });
    return ok({ ok: true });
  },
  { role: "ADMIN" }
);
