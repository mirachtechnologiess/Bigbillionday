/**
 * Minimal HTML sanitiser for admin/AI-authored product descriptions.
 * Removes script-like elements, inline event handlers and javascript:/data: URLs.
 * Plain text (no tags) is converted into paragraphs.
 */
export function sanitizeHtml(input) {
  let html = String(input || "").trim();
  if (!html) return "";
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return html
      .split(/\n{2,}/)
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
      .join("");
  }
  html = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|noscript|template|svg|math|form|textarea|select)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/?(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|frame|frameset|applet)\b[^>]*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(style|srcdoc|formaction)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src|xlink:href|action)\s*=\s*(["']?)\s*(?:javascript|vbscript|data)\s*:[^"'>]*\2/gi, '$1="#"');
  return html;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export const stripTags = (s) =>
  String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
