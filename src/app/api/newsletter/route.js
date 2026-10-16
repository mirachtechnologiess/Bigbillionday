import { z } from "zod";
import { db } from "@/lib/db";
import { handle, ok, rateLimit, clientIp } from "@/lib/api";

const schema = z.object({ email: z.string().trim().toLowerCase().email("Please enter a valid email").max(160) });

/** POST /api/newsletter { email } → idempotent subscribe. */
export const POST = handle(async (req) => {
  rateLimit(`newsletter:${clientIp(req)}`, 6, 10 * 60_000);
  const { email } = schema.parse(await req.json());
  await db.newsletter.upsert({ where: { email }, update: {}, create: { email } });
  return ok({ ok: true, message: "Welcome to the Dispatch. You're on the list." });
});
