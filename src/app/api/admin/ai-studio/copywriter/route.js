import { z } from "zod";
import { ok } from "@/lib/api";
import { adminRoute, readJson } from "@/lib/admin-api";
import { getSettings } from "@/lib/settings";
import { aiCopywriter } from "@/lib/admin-ai";

export const runtime = "nodejs";

const schema = z.object({ brief: z.string().max(400).optional().default("") });

/** POST {brief?} → { options: [{heroTitle, heroSubtitle, announcement}] } */
export const POST = adminRoute(
  async (req) => {
    const { brief } = await readJson(req, schema);
    const settings = await getSettings();
    const options = await aiCopywriter({ storeName: settings.store.name, current: settings.home, brief: brief.trim() });
    return ok({ options });
  },
  { ai: true }
);
