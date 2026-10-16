import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");
const PUBLIC_PREFIX = "/uploads";

/**
 * Optimises an uploaded image (auto-rotate, max 1600px, WebP) and stores it on disk.
 * In Docker/K8s UPLOAD_DIR is a mounted volume shared by all replicas.
 * Returns { url, width, height, blurData }.
 */
export async function saveImage(buffer, { folder = "products", maxSize = 1600 } = {}) {
  const dir = path.join(UPLOAD_DIR, folder);
  await mkdir(dir, { recursive: true });
  const id = crypto.randomBytes(10).toString("hex");
  const img = sharp(buffer, { failOn: "none" }).rotate();
  const { data, info } = await img
    .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer({ resolveWithObject: true });
  const file = `${id}.webp`;
  await writeFile(path.join(dir, file), data);
  const tiny = await sharp(buffer).rotate().resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
  return {
    url: `${PUBLIC_PREFIX}/${folder}/${file}`,
    width: info.width,
    height: info.height,
    blurData: `data:image/webp;base64,${tiny.toString("base64")}`,
  };
}

/** Small JPEG data URL for sending to the vision model. */
export async function toVisionDataUrl(buffer, size = 768) {
  const out = await sharp(buffer).rotate().resize(size, size, { fit: "inside" }).jpeg({ quality: 80 }).toBuffer();
  return `data:image/jpeg;base64,${out.toString("base64")}`;
}

export async function deleteImage(url) {
  if (!url?.startsWith(PUBLIC_PREFIX + "/")) return;
  const rel = url.slice(PUBLIC_PREFIX.length + 1);
  if (rel.includes("..")) return;
  try {
    await unlink(path.join(UPLOAD_DIR, rel));
  } catch {}
}

/** Download a remote image (e.g. from a CSV import) and store it locally. */
export async function importRemoteImage(url, opts) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Image download failed (${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  return saveImage(buf, opts);
}
