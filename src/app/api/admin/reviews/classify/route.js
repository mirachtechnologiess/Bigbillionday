import { z } from "zod";
import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-api";
import { classifyAndModerate } from "@/lib/admin-reviews";

const schema = z.object({ ids: z.array(z.string().min(1)).max(40).optional() });

export const POST = adminRoute(
  async (req) => {
    let raw = {};
    try {
      raw = (await req.json()) || {};
    } catch {}
    const { ids } = schema.parse(raw);
    return ok(await classifyAndModerate({ ids, limit: 40 }));
  },
  { ai: true }
);
