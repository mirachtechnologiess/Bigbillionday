import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ok, HttpError } from "@/lib/api";
import { adminRoute } from "@/lib/admin-api";
import { uniqueSlug, generateSku } from "@/lib/admin-products";

export const POST = adminRoute(async (req, { params }) => {
  const src = await db.product.findUnique({
    where: { id: params.id },
    include: { images: { orderBy: { position: "asc" } }, collections: true, brand: { select: { name: true } } },
  });
  if (!src) throw new HttpError(404, "Product not found");
  const {
    id, createdAt, updatedAt, images, collections, brand, slug, sku, ratingAvg, ratingCount, soldCount, viewCount, specs, ...rest
  } = src;
  const name = `${src.name} (Copy)`;
  const product = await db.product.create({
    data: {
      ...rest,
      name,
      slug: await uniqueSlug(`${brand.name} ${name}`),
      sku: await generateSku(brand.name),
      status: "DRAFT",
      isFeatured: false,
      specs: specs ?? Prisma.DbNull,
      images: { create: images.map(({ url, alt, width, height, blurData, position }) => ({ url, alt, width, height, blurData, position })) },
      collections: { create: collections.map((c) => ({ collectionId: c.collectionId, position: c.position })) },
    },
    select: { id: true, slug: true },
  });
  return ok({ product }, { status: 201 });
});
