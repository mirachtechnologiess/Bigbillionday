import { z } from "zod";
import { ok } from "@/lib/api";
import { adminRoute, readJson } from "@/lib/admin-api";
import { aiBrandDescription } from "@/lib/admin-ai";

const schema = z.object({ name: z.string().trim().min(1, "Enter a brand name first").max(80), country: z.string().trim().max(60).optional().nullable() });

export const POST = adminRoute(
  async (req) => {
    const { name, country } = await readJson(req, schema);
    const result = await aiBrandDescription(name, country || undefined);
    return ok(result);
  },
  { ai: true }
);
