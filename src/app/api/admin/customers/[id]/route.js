import { z } from "zod";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { adminRoute, assertAdminRole, readJson, HttpError } from "@/lib/admin-api";

const SAFE = { id: true, name: true, email: true, phone: true, role: true, isBlocked: true, createdAt: true };

const schema = z.object({
  isBlocked: z.boolean().optional(),
  role: z.enum(["CUSTOMER", "STAFF", "ADMIN"]).optional(),
});

export const PATCH = adminRoute(async (req, { params, user }) => {
  const body = await readJson(req, schema);
  const target = await db.user.findUnique({ where: { id: params.id }, select: SAFE });
  if (!target) throw new HttpError(404, "User not found");
  const data = {};
  if (body.isBlocked !== undefined && body.isBlocked !== target.isBlocked) {
    if (target.id === user.id) throw new HttpError(400, "You cannot block yourself");
    if (target.role !== "CUSTOMER") assertAdminRole(user);
    data.isBlocked = body.isBlocked;
  }
  if (body.role !== undefined && body.role !== target.role) {
    assertAdminRole(user);
    if (target.id === user.id) throw new HttpError(400, "You cannot change your own role");
    data.role = body.role;
  }
  if (!Object.keys(data).length) return ok({ user: target });
  const updated = await db.user.update({ where: { id: target.id }, data, select: SAFE });
  return ok({ user: updated });
});

export const DELETE = adminRoute(
  async (req, { params, user }) => {
    if (params.id === user.id) throw new HttpError(400, "You cannot delete yourself");
    const target = await db.user.findUnique({ where: { id: params.id }, select: { id: true, _count: { select: { orders: true } } } });
    if (!target) throw new HttpError(404, "User not found");
    if (target._count.orders > 0) throw new HttpError(409, "This user has orders — block the account instead of deleting it");
    await db.user.delete({ where: { id: target.id } });
    return ok({ ok: true });
  },
  { role: "ADMIN" }
);
