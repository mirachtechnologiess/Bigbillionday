import { ok } from "@/lib/api";
import { adminRoute, readJson, revalidateCatalog } from "@/lib/admin-api";
import { productInput, saveProduct } from "@/lib/admin-products";
import { listProducts } from "@/lib/admin-product-query";

export const GET = adminRoute(async (req) => ok(await listProducts(new URL(req.url).searchParams)));

export const POST = adminRoute(async (req) => {
  const data = await readJson(req, productInput);
  const { product } = await saveProduct(data);
  revalidateCatalog([product.slug]);
  return ok({ product }, { status: 201 });
});
