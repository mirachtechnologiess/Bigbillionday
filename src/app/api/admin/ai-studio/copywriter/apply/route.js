import { z } from "zod";
import { ok } from "@/lib/api";
import { adminRoute, readJson, revalidateLayout } from "@/lib/admin-api";
import { getSettings, saveSettingGroup } from "@/lib/settings";

export const runtime = "nodejs";

const schema = z.object({
  heroTitle: z.string().trim().min(2, "Hero title is required").max(80),
  heroSubtitle: z.string().trim().max(200).default(""),
  announcement: z.string().trim().max(140).default(""),
});

/** POST {heroTitle, heroSubtitle, announcement} → { home } (merged into settings.home) */
export const POST = adminRoute(
  async (req) => {
    const data = await readJson(req, schema);
    const settings = await getSettings();
    const home = { ...settings.home, ...data };
    await saveSettingGroup("home", home);
    revalidateLayout();
    return ok({ home });
  },
  { role: "ADMIN" }
);
