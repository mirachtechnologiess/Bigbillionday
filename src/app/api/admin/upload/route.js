import { ok, HttpError } from "@/lib/api";
import { adminRoute } from "@/lib/admin-api";
import { assertImage } from "@/lib/admin-products";
import { saveImage } from "@/lib/storage";

export const runtime = "nodejs";

const FOLDERS = new Set(["products", "brands", "categories", "collections", "banners", "misc"]);
const MAX = 10 * 1024 * 1024;

/** multipart: file (one or many "file" entries), folder → { url,width,height,blurData } or { files:[...] } */
export const POST = adminRoute(async (req) => {
  const form = await req.formData().catch(() => {
    throw new HttpError(400, "Expected multipart/form-data");
  });
  const folder = FOLDERS.has(String(form.get("folder"))) ? String(form.get("folder")) : "products";
  const files = form.getAll("file").filter((f) => f && typeof f === "object" && "arrayBuffer" in f);
  if (!files.length) throw new HttpError(400, "No file uploaded");
  if (files.length > 20) throw new HttpError(400, "Max 20 files per request");
  const out = [];
  for (const f of files) {
    if (f.size > MAX) throw new HttpError(413, `${f.name || "File"} exceeds 10MB`);
    const buf = Buffer.from(await f.arrayBuffer());
    await assertImage(buf, MAX); // magic-byte validation via sharp
    const saved = await saveImage(buf, { folder });
    out.push({ ...saved, name: f.name || null });
  }
  return ok(out.length === 1 ? out[0] : { files: out });
});
