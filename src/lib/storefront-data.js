import "server-only";
import { cache } from "react";
import { db } from "./db";

const ACTIVE = { status: "ACTIVE" };

export const getBrandBySlug = cache(async (slug) =>
  db.brand.findUnique({
    where: { slug },
    include: { _count: { select: { products: { where: ACTIVE } } } },
  })
);

export const getCategoryBySlug = cache(async (slug) =>
  db.category.findUnique({
    where: { slug },
    include: {
      parent: { select: { name: true, slug: true } },
      children: { select: { name: true, slug: true }, orderBy: { sortOrder: "asc" } },
      _count: { select: { products: { where: ACTIVE } } },
    },
  })
);

export const getCollectionBySlug = cache(async (slug) =>
  db.collection.findFirst({
    where: { slug, isActive: true },
    include: { _count: { select: { products: { where: { product: ACTIVE } } } } },
  })
);

/** All brands that have at least one active product, with counts. */
export const getBrandIndex = cache(async () =>
  db.brand.findMany({
    where: { products: { some: ACTIVE } },
    select: {
      name: true,
      slug: true,
      logo: true,
      country: true,
      isFeatured: true,
      _count: { select: { products: { where: ACTIVE } } },
    },
    orderBy: { name: "asc" },
  })
);

export const getCollectionsIndex = cache(async () => {
  const rows = await db.collection.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      name: true,
      slug: true,
      description: true,
      image: true,
      _count: { select: { products: { where: { product: ACTIVE } } } },
      products: {
        where: { product: ACTIVE },
        orderBy: { position: "asc" },
        take: 1,
        select: { product: { select: { images: { select: { url: true, blurData: true }, orderBy: { position: "asc" }, take: 1 } } } },
      },
    },
  });
  return rows.map((c) => ({
    ...c,
    cover: c.image || c.products[0]?.product.images[0]?.url || null,
    coverBlur: c.image ? null : c.products[0]?.product.images[0]?.blurData || null,
  }));
});
