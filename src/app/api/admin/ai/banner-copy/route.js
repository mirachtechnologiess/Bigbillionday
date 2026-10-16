import { z } from "zod";
import { ok } from "@/lib/api";
import { adminRoute, readJson, HttpError } from "@/lib/admin-api";
import { aiBannerCopy } from "@/lib/admin-ai";
import { getBannerProduct } from "@/lib/admin-banners";

const schema = z.object({
  productId: z.string().trim().max(40).optional().nullable(),
  discount: z.string().trim().max(80).optional().nullable(),
  brief: z.string().trim().max(300).optional().nullable(),
  placement: z.string().trim().max(40).optional().nullable(),
  current: z
    .object({ title: z.string().max(200).optional().nullable(), subtitle: z.string().max(400).optional().nullable(), badge: z.string().max(60).optional().nullable() })
    .optional()
    .nullable(),
});

/** Body { productId?, discount?, brief?, placement?, current? } → { title, subtitle, badge, ctaLabel } */
export const POST = adminRoute(
  async (req) => {
    const body = await readJson(req, schema);
    const product = body.productId ? await getBannerProduct(body.productId) : null;
    if (body.productId && !product) throw new HttpError(404, "Product not found");
    const copy = await aiBannerCopy({
      product,
      discount: body.discount || (product?.off ? `${product.off}% off (₹${product.mrp} → ₹${product.price})` : ""),
      brief: body.brief || "",
      placement: body.placement || "home_hero",
      current: body.current || {},
    });
    if (!copy.title) throw new HttpError(502, "AI returned empty copy — try again");
    return ok(copy);
  },
  { ai: true }
);
