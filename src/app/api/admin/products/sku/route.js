import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-api";
import { generateSku } from "@/lib/admin-products";

/** GET ?brand=Fossil → { sku: "PS-FOS-1001" } */
export const GET = adminRoute(async (req) => {
  const brand = new URL(req.url).searchParams.get("brand") || "GEN";
  return ok({ sku: await generateSku(brand) });
});
