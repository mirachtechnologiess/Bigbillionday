import { db } from "@/lib/db";
import { handle, ok, HttpError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { addressSchema } from "@/lib/validators";

async function own(params) {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Please sign in");
  const { id } = await params;
  const address = await db.address.findFirst({ where: { id: String(id), userId: user.id } });
  if (!address) throw new HttpError(404, "Address not found");
  return { user, address };
}

/** PATCH /api/account/addresses/{id} — full address body, or { isDefault: true } only → { address } */
export const PATCH = handle(async (req, { params }) => {
  const { user, address } = await own(params);
  const body = await req.json();
  const onlyDefault = body && Object.keys(body).length === 1 && body.isDefault === true;
  const data = onlyDefault ? { isDefault: true } : addressSchema.parse(body);
  const updated = await db.$transaction(async (tx) => {
    if (data.isDefault) await tx.address.updateMany({ where: { userId: user.id, id: { not: address.id } }, data: { isDefault: false } });
    return tx.address.update({ where: { id: address.id }, data: { ...data, isDefault: data.isDefault || address.isDefault } });
  });
  return ok({ address: updated });
});

/** DELETE /api/account/addresses/{id} → { ok: true } */
export const DELETE = handle(async (req, { params }) => {
  const { user, address } = await own(params);
  await db.address.delete({ where: { id: address.id } });
  if (address.isDefault) {
    const next = await db.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    if (next) await db.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  return ok({ ok: true });
});
