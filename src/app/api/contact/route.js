import { z } from "zod";
import { db } from "@/lib/db";
import { handle, ok, rateLimit, clientIp, HttpError } from "@/lib/api";

export const dynamic = "force-dynamic";

const phone = z
  .string()
  .trim()
  .optional()
  .default("")
  .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+?91|0)(?=\d{10}$)/, ""))
  .refine((v) => v === "" || /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit Indian mobile number");

const schema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80, "Name is too long"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(160),
  phone,
  message: z.string().trim().min(10, "Message is too short").max(2000, "Message is too long"),
});

export const POST = handle(async (req) => {
  rateLimit(`contact:${clientIp(req)}`, 5, 60_000);

  const body = await req.json().catch(() => {
    throw new HttpError(400, "Invalid request body");
  });

  // Honeypot: bots fill hidden fields. Pretend success, store nothing.
  if (typeof body?.website === "string" && body.website.trim() !== "") return ok({ ok: true });

  const { name, email, phone: tel, message } = schema.parse(body ?? {});

  await db.contactMessage.create({
    data: { name, email, phone: tel || null, message },
  });

  return ok({ ok: true });
});
