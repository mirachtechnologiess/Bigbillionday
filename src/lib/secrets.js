import "server-only";
import crypto from "node:crypto";
import { db } from "./db";

/**
 * Encrypted secrets stored in the Setting table (rows keyed "secret:<name>").
 * - AES-256-GCM; the key is derived from AUTH_SECRET, so a DB dump alone does not reveal secrets.
 * - These rows are never part of getSettings() (see lib/settings.js), so they can't reach a browser.
 * - Rotating AUTH_SECRET makes stored secrets unreadable: readers then fall back to env vars and the
 *   admin panel shows "re-enter key".
 */
const PREFIX = "secret:";
const encKey = () =>
  crypto.createHash("sha256").update(`bbd-secrets:${process.env.AUTH_SECRET || "dev-insecure-secret-change-me"}`).digest();

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey(), iv);
  const ct = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  return `v1:${Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64")}`;
}

function decrypt(blob) {
  if (typeof blob !== "string" || !blob.startsWith("v1:")) return null;
  try {
    const raw = Buffer.from(blob.slice(3), "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", encKey(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    return null; // wrong AUTH_SECRET or tampered value
  }
}

/** { value, last4, updatedAt, updatedBy, unreadable } or null when not stored. */
export async function readSecret(name) {
  const row = await db.setting.findUnique({ where: { key: PREFIX + name } });
  if (!row?.value) return null;
  const value = decrypt(row.value.enc);
  return { value, last4: row.value.last4, updatedAt: row.value.updatedAt, updatedBy: row.value.updatedBy, unreadable: value == null };
}

export async function writeSecret(name, value, updatedBy) {
  const data = { enc: encrypt(value), last4: String(value).slice(-4), updatedAt: new Date().toISOString(), updatedBy: updatedBy || null };
  await db.setting.upsert({ where: { key: PREFIX + name }, update: { value: data }, create: { key: PREFIX + name, value: data } });
}

export async function deleteSecret(name) {
  await db.setting.deleteMany({ where: { key: PREFIX + name } });
}

export const isSecretKey = (key) => key.startsWith(PREFIX);
