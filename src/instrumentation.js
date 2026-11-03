/**
 * Runs once when the Next.js server starts. Node-only work lives in instrumentation-node.js so the
 * Edge bundle never pulls in server modules (the NEXT_RUNTIME check is resolved at build time).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
