// Small, isomorphic display helpers (safe in server + client components).

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

export const formatDate = (d) => (d ? dateFmt.format(new Date(d)) : "");
export const formatDateTime = (d) => (d ? dateTimeFmt.format(new Date(d)) : "");

/** Visual tone for an order status. */
export function statusTone(status) {
  if (status === "DELIVERED") return "lume";
  if (status === "CANCELLED" || status === "RETURNED") return "ember";
  if (status === "RETURN_REQUESTED") return "ember";
  return "gold";
}

export const TONE_CLASS = {
  lume: "border-lume/30 text-lume bg-lume/10",
  ember: "border-ember/30 text-ember bg-ember/10",
  gold: "border-gold/30 text-gold-2 bg-gold-3",
};

export const firstName = (name = "") => String(name).trim().split(/\s+/)[0] || "";

/** Client-side mirror of the server's pincode-prefix serviceability rule. */
export function pincodeServiceable(pincode, list) {
  const prefixes = String(list || "")
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return !prefixes.length || prefixes.some((p) => String(pincode).startsWith(p));
}
