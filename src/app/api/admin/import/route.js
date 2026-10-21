import { z } from "zod";
import { ok } from "@/lib/api";
import { adminRoute, HttpError, readJson, revalidateCatalog } from "@/lib/admin-api";
import { canEnrich, importRow } from "@/lib/admin-import";

export const runtime = "nodejs";
export const maxDuration = 300;

const schema = z.object({
  rows: z
    .array(
      z.object({
        index: z.number().int().min(0),
        data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
      })
    )
    .min(1)
    .max(25),
  options: z
    .object({
      enrich: z.boolean().default(false),
      downloadImages: z.boolean().default(false),
      updateExisting: z.boolean().default(false),
      defaultStatus: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
    })
    .default({}),
});

/** POST {rows:[{index,data}], options} → { results: [{index, ok, id, action, error, warnings}] } */
export const POST = adminRoute(async (req) => {
  const { rows, options } = await readJson(req, schema);
  if (options.enrich && !(await canEnrich())) throw new HttpError(503, "AI is not configured — turn off AI enrichment or set NVIDIA_API_KEY");
  const ctx = { categories: new Map() };
  const results = [];
  for (const r of rows) {
    const res = await importRow(r.data, options, ctx);
    results.push({ index: r.index, ...res });
  }
  revalidateCatalog(results.filter((r) => r.ok && r.action === "updated").map((r) => r.slug));
  return ok({ results });
});
