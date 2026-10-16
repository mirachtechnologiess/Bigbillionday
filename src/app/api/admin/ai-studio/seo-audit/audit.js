import "server-only";

export const AUDIT_SELECT = {
  id: true,
  name: true,
  slug: true,
  status: true,
  seoTitle: true,
  seoDesc: true,
  description: true,
  tags: true,
  brand: { select: { name: true } },
  images: { orderBy: { position: "asc" }, select: { id: true, url: true, alt: true } },
};

export const textLength = (html) => String(html || "").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim().length;

/**
 * Returns a list of issue codes for a product:
 * seoTitle-missing|seoTitle-long|seoTitle-short, seoDesc-*, desc-missing|desc-short, alt-missing, tags-few
 */
export function auditProduct(p) {
  const issues = [];
  const t = (p.seoTitle || "").trim();
  if (!t) issues.push("seoTitle-missing");
  else if (t.length > 60) issues.push("seoTitle-long");
  else if (t.length < 20) issues.push("seoTitle-short");

  const d = (p.seoDesc || "").trim();
  if (!d) issues.push("seoDesc-missing");
  else if (d.length > 155) issues.push("seoDesc-long");
  else if (d.length < 50) issues.push("seoDesc-short");

  const len = textLength(p.description);
  if (!len) issues.push("desc-missing");
  else if (len < 300) issues.push("desc-short");

  if ((p.images || []).some((im) => !im.alt || !im.alt.trim())) issues.push("alt-missing");
  if ((p.tags || []).length < 5) issues.push("tags-few");
  return issues;
}
