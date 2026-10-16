import { z } from "zod";
import { db } from "@/lib/db";
import { ok } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { adminRoute, readJson } from "@/lib/admin-api";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, "").slice(-10))
    .refine((v) => v === "" || /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit mobile number")
    .optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  role: z.enum(["STAFF", "ADMIN"]),
});

/** Create a staff / admin account (ADMIN only). */
export const POST = adminRoute(
  async (req) => {
    const b = await readJson(req, schema);
    const user = await db.user.create({
      data: { name: b.name, email: b.email, phone: b.phone || null, role: b.role, passwordHash: await hashPassword(b.password) },
      select: { id: true, name: true, email: true, phone: true, role: true, isBlocked: true, createdAt: true },
    });
    return ok({ user }, { status: 201 });
  },
  { role: "ADMIN" }
);
