import { z } from "zod";
import { db } from "@/lib/db";
import { handle, ok, fail, rateLimit, clientIp } from "@/lib/api";
import { getSession } from "@/lib/auth";

const strip = (s) =>
  String(s || "")
    .replace(/<[^>]*>/g, "")
    .trim();

const schema = z.object({
  productId: z.string().min(1).max(40),
  name: z.string().transform(strip).pipe(z.string().min(2, "Please enter your name").max(60)),
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  title: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? strip(v).slice(0, 100) : null)),
  body: z.string().transform(strip).pipe(z.string().min(10, "Review must be at least 10 characters").max(2000)),
  website: z.string().optional().nullable(), // honeypot
});

/** POST /api/reviews { productId, name, rating, title?, body } → creates a PENDING review. */
export const POST = handle(async (req) => {
  const ip = clientIp(req);
  rateLimit(`review:${ip}`, 5, 10 * 60_000);
  const data = schema.parse(await req.json());
  if (data.website) return ok({ ok: true, status: "PENDING" }); // silently drop bots

  const product = await db.product.findFirst({ where: { id: data.productId, status: "ACTIVE" }, select: { id: true } });
  if (!product) return fail("Product not found", 404);

  const session = await getSession().catch(() => null);
  const userId = session?.sub || null;
  let verified = false;
  if (userId) {
    rateLimit(`review-user:${userId}:${product.id}`, 2, 24 * 60 * 60_000);
    const bought = await db.orderItem.findFirst({
      where: { productId: product.id, order: { userId, status: "DELIVERED" } },
      select: { id: true },
    });
    verified = !!bought;
  }

  const review = await db.review.create({
    data: {
      productId: product.id,
      userId,
      name: data.name,
      rating: data.rating,
      title: data.title || null,
      body: data.body,
      status: "PENDING",
      verified,
    },
    select: { id: true, status: true },
  });
  return ok({ ok: true, id: review.id, status: review.status }, { status: 201 });
});
