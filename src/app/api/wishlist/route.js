import { z } from "zod";
import { db } from "@/lib/db";
import { handle, ok, rateLimit, clientIp } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { cardSelect } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const idRe = /^[a-z0-9]{10,40}$/i;

/**
 * GET /api/wishlist?ids=a,b → { products } (cardSelect shape, ACTIVE only, in the given order)
 * GET /api/wishlist (signed in) → { ids, products }
 */
export const GET = handle(async (req) => {
  const raw = req.nextUrl.searchParams.get("ids");
  if (raw != null) {
    const ids = raw
      .split(",")
      .filter((x) => idRe.test(x))
      .slice(0, 60);
    if (!ids.length) return ok({ products: [] });
    const products = await db.product.findMany({ where: { id: { in: ids }, status: "ACTIVE" }, select: cardSelect });
    const pos = new Map(ids.map((id, i) => [id, i]));
    products.sort((a, b) => pos.get(a.id) - pos.get(b.id));
    return ok({ products });
  }
  const session = await getSession();
  if (!session?.sub) return ok({ ids: [], products: [] });
  const rows = await db.wishlistItem.findMany({
    where: { userId: session.sub, product: { status: "ACTIVE" } },
    orderBy: { createdAt: "desc" },
    select: { product: { select: cardSelect } },
  });
  return ok({ ids: rows.map((r) => r.product.id), products: rows.map((r) => r.product) });
});

const body = z.union([
  z.object({ productId: z.string().regex(idRe), wished: z.boolean().optional() }),
  z.object({ merge: z.array(z.string().regex(idRe)).max(60) }),
]);

/**
 * POST /api/wishlist { productId, wished? } → wished true=add, false=remove, absent=toggle → { ids, saved }
 * POST /api/wishlist { merge: [ids] } → adds guest ids to the account → { ids }
 * Guests: 200 { ids: null, guest: true } (client keeps its local list)
 */
export const POST = handle(async (req) => {
  rateLimit(`wishlist:${clientIp(req)}`, 60, 60_000);
  const input = body.parse(await req.json());
  const session = await getSession();
  if (!session?.sub) return ok({ ids: null, guest: true });
  const userId = session.sub;
  let saved;
  if ("productId" in input) {
    const key = { userId_productId: { userId, productId: input.productId } };
    const existing = await db.wishlistItem.findUnique({ where: key });
    // Honour an explicit `wished` flag; toggle only when it is absent
    const want = typeof input.wished === "boolean" ? input.wished : !existing;
    if (!want) {
      if (existing) await db.wishlistItem.delete({ where: key });
      saved = false;
    } else if (existing) {
      saved = true;
    } else {
      const p = await db.product.findUnique({ where: { id: input.productId }, select: { id: true } });
      if (p) await db.wishlistItem.upsert({ where: key, create: { userId, productId: p.id }, update: {} });
      saved = Boolean(p);
    }
  } else if (input.merge.length) {
    const valid = await db.product.findMany({ where: { id: { in: input.merge } }, select: { id: true } });
    await db.wishlistItem.createMany({ data: valid.map((p) => ({ userId, productId: p.id })), skipDuplicates: true });
  }
  const rows = await db.wishlistItem.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { productId: true } });
  return ok({ ids: rows.map((r) => r.productId), ...(saved !== undefined && { saved }) });
});
