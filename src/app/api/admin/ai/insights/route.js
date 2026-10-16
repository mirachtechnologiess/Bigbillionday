import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-api";
import { insightsMetrics } from "@/lib/admin-metrics";
import { aiInsights } from "@/lib/admin-ai";

export const runtime = "nodejs";

/** POST → { insights: [{title, detail, impact}], generatedAt } */
export const POST = adminRoute(
  async () => {
    const metrics = await insightsMetrics();
    const insights = await aiInsights(metrics);
    return ok({ insights, generatedAt: new Date().toISOString() });
  },
  { ai: true }
);
