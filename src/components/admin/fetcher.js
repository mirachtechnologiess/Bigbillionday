"use client";

/**
 * JSON fetch helper for admin client components.
 *   const data = await api("/api/admin/products", { method: "POST", body: {...} })
 * Throws Error(message) on non-2xx (message comes from { error } in the response).
 * Pass FormData as body for multipart uploads.
 */
export async function api(url, { method = "GET", body, signal, headers } = {}) {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(url, {
    method,
    signal,
    headers: isForm || body === undefined ? headers : { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    cache: "no-store",
  });
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text?.slice(0, 200) };
  }
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") window.location.href = `/admin/login?next=${encodeURIComponent(location.pathname)}`;
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Upload one File to /api/admin/upload → { url, width, height, blurData } */
export async function uploadImage(file, folder = "products") {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  return api("/api/admin/upload", { method: "POST", body: fd });
}

/** Trigger a file download for a string or Blob. */
export function downloadFile(content, filename, type = "text/csv;charset=utf-8") {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}
