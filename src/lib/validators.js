// Shared zod schemas — imported by both client forms and API routes.
import { z } from "zod";

/** Strip spaces/dashes/+91/leading 0 and return the bare 10-digit mobile number. */
export function normalizePhone(v) {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
}

const trimmed = (min, max, msg) => z.string({ required_error: msg }).trim().min(min, msg).max(max, `Keep it under ${max} characters`);
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const phoneSchema = z
  .string({ required_error: "Enter your mobile number" })
  .transform(normalizePhone)
  .refine((v) => /^[6-9]\d{9}$/.test(v), "Enter a valid 10-digit Indian mobile number");

export const emailSchema = z
  .string({ required_error: "Enter your email" })
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(120);

export const pincodeSchema = z
  .string({ required_error: "Enter your pincode" })
  .trim()
  .regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode");

export const addressFields = {
  name: trimmed(2, 80, "Enter the recipient's full name"),
  line1: trimmed(4, 160, "Enter house / flat and street"),
  line2: optionalText(160),
  landmark: optionalText(100),
  pincode: pincodeSchema,
  city: trimmed(2, 60, "Enter your city"),
  state: trimmed(2, 60, "Select your state"),
};

export const addressSchema = z.object({
  ...addressFields,
  phone: phoneSchema,
  isDefault: z.boolean().optional().default(false),
});

export const checkoutSchema = z.object({
  email: emailSchema,
  phone: phoneSchema,
  ...addressFields,
  paymentMethod: z.enum(["COD", "RAZORPAY"]).default("COD"),
  couponCode: z
    .string()
    .trim()
    .toUpperCase()
    .max(40)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  notes: optionalText(300),
  saveAddress: z.boolean().optional().default(false),
  items: z
    .array(z.object({ productId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(10) }))
    .min(1, "Your bag is empty")
    .max(30),
});

/** Client-side subset (no items) used to validate the form before submit. */
export const checkoutFormSchema = checkoutSchema.omit({ items: true, couponCode: true, saveAddress: true, paymentMethod: true });

export const loginSchema = z.object({
  identifier: z.string({ required_error: "Enter your email or mobile" }).trim().min(3, "Enter your email or mobile").max(120),
  password: z.string({ required_error: "Enter your password" }).min(1, "Enter your password").max(200),
});

export const passwordSchema = z.string().min(8, "Use at least 8 characters").max(200);

export const registerSchema = z.object({
  name: trimmed(2, 80, "Enter your full name"),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

export const profileSchema = z.object({
  name: trimmed(2, 80, "Enter your full name"),
  phone: phoneSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: passwordSchema,
});

export const trackSchema = z.object({
  orderNumber: z.string().trim().toUpperCase().min(6, "Enter your order number").max(30),
  phone: phoneSchema,
});

/** zod error → { field: firstMessage } */
export function fieldErrors(error) {
  const out = {};
  for (const issue of error?.issues || []) {
    const k = issue.path[0];
    if (k != null && !out[k]) out[k] = issue.message;
  }
  return out;
}

/** API 422 `issues` ({field: [msg]}) → { field: msg } */
export function issuesToErrors(issues) {
  const out = {};
  for (const [k, v] of Object.entries(issues || {})) if (v?.[0]) out[k] = v[0];
  return out;
}

/** Only allow same-origin relative redirects. */
export function safeNext(next, fallback = "/account") {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
