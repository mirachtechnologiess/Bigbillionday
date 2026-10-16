import { z } from "zod";
import { ok } from "@/lib/api";
import { adminRoute, readJson } from "@/lib/admin-api";
import { storeSnapshot } from "@/lib/admin-metrics";
import { aiAsk } from "@/lib/admin-ai";

export const runtime = "nodejs";

const schema = z.object({ question: z.string().trim().min(3, "Ask a question").max(500) });

/**
 * POST {question} → { answer }
 * The model only ever sees a precomputed, read-only metrics snapshot. It never writes or runs queries.
 */
export const POST = adminRoute(
  async (req) => {
    const { question } = await readJson(req, schema);
    const snapshot = await storeSnapshot();
    const answer = await aiAsk(question, snapshot);
    return ok({ answer: answer || "I could not find an answer in the store snapshot." });
  },
  { ai: true }
);
