import { db } from "@/lib/db";
import { handle, ok, HttpError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { addressSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Please sign in");
  return user;
}

/** GET /api/account/addresses → { addresses } */
export const GET = handle(async () => {
  const user = await requireUser();
  const addresses = await db.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return ok({ addresses });
});

/** POST /api/account/addresses { name, phone, line1, line2?, landmark?, city, state, pincode, isDefault? } → 201 { address } */
export const POST = handle(async (req) => {
  const user = await requireUser();
  const data = addressSchema.parse(await req.json());
  const count = await db.address.count({ where: { userId: user.id } });
  if (count >= 10) throw new HttpError(400, "You can save up to 10 addresses");
  const isDefault = data.isDefault || count === 0;
  const address = await db.$transaction(async (tx) => {
    if (isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    return tx.address.create({ data: { ...data, isDefault, userId: user.id } });
  });
  return ok({ address }, { status: 201 });
});
