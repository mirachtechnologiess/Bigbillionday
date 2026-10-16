import { db } from "@/lib/db";
import { ok, HttpError } from "@/lib/api";
import { adminRoute, readJson, revalidateCatalog } from "@/lib/admin-api";
import { productInput, productPatch, saveProduct, getProductForEdit } from "@/lib/admin-products";
import { deleteImage } from "@/lib/storage";

export const GET = adminRoute(async (req, { params }) => {
  const product = await getProductForEdit(params.id);
  if (!product) throw new HttpError(404, "Product not found");
  return ok({ product });
});

export const PUT = adminRoute(async (req, { params }) => {
  const data = await readJson(req, productInput);
  const { product, previousSlug } = await saveProduct(data, params.id);
  revalidateCatalog([product.slug, previousSlug]);
  return ok({ product });
});

/** Quick edit (price / stock / status / flags / seo). */
export const PATCH = adminRoute(async (req, { params }) => {
  const data = await readJson(req, productPatch);
  const cur = await db.product.findUnique({ where: { id: params.id }, select: { price: true, mrp: true } });
  if (!cur) throw new HttpError(404, "Product not found");
  if (data.price !== undefined || data.mrp !== undefined) data.mrp = Math.max(data.mrp ?? cur.mrp, data.price ?? cur.price);
  const product = await db.product.update({
    where: { id: params.id },
    data,
    select: { id: true, slug: true, price: true, mrp: true, stock: true, status: true, isFeatured: true },
  });
  revalidateCatalog([product.slug]);
  return ok({ product });
});

/** ADMIN only. Products with order history are archived instead (keeps invoices intact). */
export const DELETE = adminRoute(
  async (req, { params }) => {
    const p = await db.product.findUnique({
      where: { id: params.id },
      select: { id: true, slug: true, images: { select: { url: true } }, _count: { select: { orderItems: true } } },
    });
    if (!p) throw new HttpError(404, "Product not found");
    if (p._count.orderItems > 0) {
      await db.product.update({ where: { id: p.id }, data: { status: "ARCHIVED" } });
      revalidateCatalog([p.slug]);
      return ok({ archived: true, message: "Product has orders — archived instead of deleted" });
    }
    await db.product.delete({ where: { id: p.id } });
    const urls = p.images.map((i) => i.url);
    const stillUsed = new Set((await db.productImage.findMany({ where: { url: { in: urls } }, select: { url: true } })).map((i) => i.url));
    await Promise.all(urls.filter((u) => !stillUsed.has(u)).map((u) => deleteImage(u)));
    revalidateCatalog([p.slug]);
    return ok({ deleted: true });
  },
  { role: "ADMIN" }
);
