import { readFile, stat } from "node:fs/promises";
import path from "node:path";

// Serves user-uploaded media from UPLOAD_DIR (a persistent volume in Docker/K8s).
// Next.js does not serve files added to /public after build, hence this route.
const ROOT = path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");
const TYPES = { ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".avif": "image/avif", ".svg": "image/svg+xml", ".gif": "image/gif" };

export async function GET(_req, { params }) {
  const parts = (await params).path || [];
  const file = path.resolve(ROOT, ...parts);
  if (!file.startsWith(ROOT + path.sep)) return new Response("Not found", { status: 404 });
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const [buf, info] = await Promise.all([readFile(file), stat(file)]);
    return new Response(buf, {
      headers: {
        "Content-Type": type,
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Last-Modified": info.mtime.toUTCString(),
        ...(type === "image/svg+xml" && { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" }),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
