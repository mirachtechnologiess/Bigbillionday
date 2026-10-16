/** Device capability probe — decides geometry detail, shadows and DPR for the 3D scene. */
export function getQuality() {
  if (typeof window === "undefined") return { low: true, mobile: true, webgl: false };
  const mobile = window.innerWidth < 768;
  const conn = navigator.connection || {};
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 8;
  const low = mobile || cores <= 4 || mem <= 4 || !!conn.saveData;
  return { low, mobile, webgl: hasWebGL() };
}

export function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGL2RenderingContext && c.getContext("webgl2")) || !!c.getContext("webgl");
  } catch {
    return false;
  }
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
