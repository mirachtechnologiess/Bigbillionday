import "server-only";
import crypto from "node:crypto";
import { db } from "./db";
import { HttpError } from "./api";
import { deleteSecret, readSecret, writeSecret } from "./secrets";
import { updateOrder, canTransition } from "./admin-orders";
import { ORDER_FLOW } from "./utils";

/**
 * Shiprocket integration (https://apidocs.shiprocket.in).
 *  - Credentials: a Shiprocket "API user" (Settings → API → API Users), stored encrypted via lib/secrets.
 *  - Auth tokens last 10 days; cached in memory and refreshed on 401.
 *  - Booking: create custom order → assign AWB (chosen courier) → request pickup → label.
 *  - Tracking: webhook (/api/hooks/courier-update) + periodic sync; statuses move our order forward.
 */
const BASE = "https://apiv2.shiprocket.in/v1/external";
const CRED_KEY = "shiprocket_credentials"; // JSON { email, password }
const HOOK_KEY = "shiprocket_webhook_token";
const CONFIG_KEY = "shiprocket:config";
const TOKEN_TTL = 8 * 24 * 3600 * 1000; // tokens are valid 10 days; refresh earlier

export const DEFAULT_SHIP_CONFIG = {
  pickupLocation: "", // Shiprocket pickup location name, e.g. "Primary"
  pickupPincode: "",
  weightKg: 0.5,
  lengthCm: 15,
  breadthCm: 12,
  heightCm: 8,
  autoPickup: true, // request courier pickup right after the AWB is assigned
  autoStatus: true, // move our order status from tracking updates
};

/** Orders that may be booked with a courier. */
export const SHIPPABLE = ["PENDING", "CONFIRMED", "PACKED"];

// ───────────────────────── config & credentials ─────────────────────────

export async function getShipConfig() {
  const row = await db.setting.findUnique({ where: { key: CONFIG_KEY } });
  return { ...DEFAULT_SHIP_CONFIG, ...(row?.value || {}) };
}

export async function saveShipConfig(patch) {
  const value = { ...(await getShipConfig()), ...patch };
  await db.setting.upsert({ where: { key: CONFIG_KEY }, update: { value }, create: { key: CONFIG_KEY, value } });
  return value;
}

async function getCredentials() {
  const s = await readSecret(CRED_KEY);
  if (!s?.value) return null;
  try {
    const c = JSON.parse(s.value);
    return c?.email && c?.password ? { ...c, updatedAt: s.updatedAt, updatedBy: s.updatedBy } : null;
  } catch {
    return null;
  }
}

/** Public status for the admin panel — never includes the password or token. */
export async function credentialStatus() {
  const s = await readSecret(CRED_KEY);
  if (!s) return null;
  if (s.unreadable) return { unreadable: true };
  try {
    const c = JSON.parse(s.value);
    return { email: c.email, updatedAt: s.updatedAt, updatedBy: s.updatedBy };
  } catch {
    return { unreadable: true };
  }
}

let tokenCache = null; // { token, exp, email }

async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(20_000),
  }).catch(() => {
    throw new HttpError(502, "Could not reach Shiprocket — try again in a minute");
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    throw new HttpError(400, res.status === 401 || res.status === 403 || res.status === 400
      ? "Shiprocket rejected these credentials. Use an API user (Shiprocket → Settings → API → API Users), not your main login."
      : `Shiprocket login failed: ${errorText(data) || res.status}`);
  }
  return data.token;
}

/** Verify with Shiprocket, then store encrypted. */
export async function saveCredentials(email, password, updatedBy) {
  const token = await login(email, password);
  await writeSecret(CRED_KEY, JSON.stringify({ email, password }), updatedBy);
  tokenCache = { token, exp: Date.now() + TOKEN_TTL, email };
}

export async function removeCredentials() {
  await deleteSecret(CRED_KEY);
  tokenCache = null;
}

async function getToken(force = false) {
  const cred = await getCredentials();
  if (!cred) throw new HttpError(400, "Shiprocket is not connected — add the API user in Settings → Shipping");
  if (!force && tokenCache && tokenCache.email === cred.email && tokenCache.exp > Date.now()) return tokenCache.token;
  const token = await login(cred.email, cred.password);
  tokenCache = { token, exp: Date.now() + TOKEN_TTL, email: cred.email };
  return token;
}

function errorText(data) {
  if (!data || typeof data !== "object") return "";
  const errs = data.errors && typeof data.errors === "object" ? Object.values(data.errors).flat().filter((x) => typeof x === "string") : [];
  return [data.message, ...errs].filter(Boolean).join(" · ").slice(0, 400);
}

/** Authenticated JSON call; retries once with a fresh token on 401. */
async function sr(path, { method = "GET", body, retry = true } = {}) {
  const token = await getToken();
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
  } catch {
    throw new HttpError(502, "Could not reach Shiprocket — try again in a minute");
  }
  if (res.status === 401 && retry) {
    tokenCache = null;
    await getToken(true);
    return sr(path, { method, body, retry: false });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(res.status >= 500 ? 502 : 400, `Shiprocket: ${errorText(data) || `HTTP ${res.status}`}`);
  return data;
}

// ───────────────────────── account helpers ─────────────────────────

export async function getPickupLocations() {
  const r = await sr("/settings/company/pickup");
  return (r?.data?.shipping_address || []).map((a) => ({
    name: a.pickup_location,
    pincode: String(a.pin_code || ""),
    address: [a.address, a.address_2, a.city, a.state].filter(Boolean).join(", "),
    primary: a.is_primary_location === 1,
    verified: a.phone_verified === 1,
  }));
}

export async function getWalletBalance() {
  const r = await sr("/account/details/wallet-balance");
  const n = Number(r?.data?.balance_amount);
  return Number.isFinite(n) ? n : null;
}

// ───────────────────────── webhook token ─────────────────────────

export async function getWebhookToken() {
  return (await readSecret(HOOK_KEY))?.value || null;
}

export async function rotateWebhookToken(updatedBy) {
  const token = crypto.randomBytes(24).toString("hex");
  await writeSecret(HOOK_KEY, token, updatedBy);
  return token;
}

export async function verifyWebhookToken(given) {
  const expected = await getWebhookToken();
  if (!expected || typeof given !== "string" || given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

// ───────────────────────── booking ─────────────────────────

const digits10 = (p) => String(p || "").replace(/\D/g, "").slice(-10);
const istDate = (d) => new Date(new Date(d).getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ");

/** Package from the modal, validated, falling back to the configured defaults. */
export function normalisePackage(pkg = {}, cfg = DEFAULT_SHIP_CONFIG) {
  const num = (v, d, min, max) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= min && n <= max ? n : d;
  };
  return {
    weightKg: Math.round(num(pkg.weightKg, cfg.weightKg, 0.05, 50) * 1000) / 1000,
    lengthCm: Math.round(num(pkg.lengthCm, cfg.lengthCm, 1, 200)),
    breadthCm: Math.round(num(pkg.breadthCm, cfg.breadthCm, 1, 200)),
    heightCm: Math.round(num(pkg.heightCm, cfg.heightCm, 1, 200)),
  };
}

/** Suggested package for an order: sum of product weights (+100 g packing) when every item has one. */
export async function suggestedPackage(order) {
  const cfg = await getShipConfig();
  const ids = order.items.map((i) => i.productId).filter(Boolean);
  const products = ids.length ? await db.product.findMany({ where: { id: { in: ids } }, select: { id: true, weightGrams: true } }) : [];
  const w = Object.fromEntries(products.map((p) => [p.id, p.weightGrams]));
  const known = order.items.every((i) => i.productId && w[i.productId]);
  const grams = known ? order.items.reduce((s, i) => s + w[i.productId] * i.quantity, 0) + 100 : null;
  return normalisePackage({ ...cfg, weightKg: grams ? Math.max(cfg.weightKg, grams / 1000) : cfg.weightKg }, cfg);
}

async function requireReadyConfig() {
  const cfg = await getShipConfig();
  if (!cfg.pickupLocation || !/^\d{6}$/.test(cfg.pickupPincode)) {
    throw new HttpError(400, "Choose your Shiprocket pickup address in Settings → Shipping first");
  }
  return cfg;
}

const isCod = (order) => order.paymentMethod === "COD" && order.paymentStatus !== "PAID";

/** Couriers that can deliver this order, with price / rating / speed. */
export async function quoteCouriers(order, pkgInput) {
  const cfg = await requireReadyConfig();
  const pkg = normalisePackage(pkgInput, cfg);
  const q = new URLSearchParams({
    pickup_postcode: cfg.pickupPincode,
    delivery_postcode: order.pincode,
    cod: isCod(order) ? "1" : "0",
    weight: String(pkg.weightKg),
    length: String(pkg.lengthCm),
    breadth: String(pkg.breadthCm),
    height: String(pkg.heightCm),
    declared_value: String(order.total),
  });
  const r = await sr(`/courier/serviceability/?${q}`);
  const list = r?.data?.available_courier_companies || [];
  if (!list.length) throw new HttpError(400, errorText(r) || `No courier delivers to ${order.pincode} for this order`);
  const num = (v) => (Number.isFinite(Number(v)) && v !== "" && v !== null ? Number(v) : null);
  return {
    package: pkg,
    cod: isCod(order),
    recommendedId: num(r?.data?.recommended_courier_company_id) ?? num(r?.data?.shiprocket_recommended_courier_id),
    couriers: list.map((c) => ({
      id: c.courier_company_id,
      name: c.courier_name,
      rate: num(c.rate) ?? num(c.freight_charge) ?? 0,
      codCharges: num(c.cod_charges) ?? 0,
      rtoCharges: num(c.rto_charges),
      rating: num(c.rating),
      deliveryPerformance: num(c.delivery_performance),
      pickupPerformance: num(c.pickup_performance),
      days: num(c.estimated_delivery_days),
      etd: c.etd || null,
      surface: Boolean(c.is_surface),
      chargeWeight: num(c.charge_weight),
      cutoff: c.cutoff_time || null,
    })),
  };
}

function orderPayload(order, cfg, pkg, channelOrderId) {
  const [first, ...rest] = String(order.shippingName || "Customer").trim().split(/\s+/);
  const subTotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  return {
    order_id: channelOrderId,
    order_date: istDate(order.createdAt),
    pickup_location: cfg.pickupLocation,
    billing_customer_name: first,
    billing_last_name: rest.join(" ") || ".",
    billing_address: order.line1,
    billing_address_2: [order.line2, order.landmark && `Landmark: ${order.landmark}`].filter(Boolean).join(", "),
    billing_city: order.city,
    billing_pincode: order.pincode,
    billing_state: order.state,
    billing_country: "India",
    billing_email: order.email,
    billing_phone: digits10(order.phone),
    shipping_is_billing: true,
    order_items: order.items.map((i) => ({
      name: i.name.slice(0, 200),
      sku: i.sku,
      units: i.quantity,
      selling_price: i.price,
      discount: 0,
      tax: 0,
      hsn: "",
    })),
    payment_method: isCod(order) ? "COD" : "Prepaid",
    // COD amount Shiprocket collects = sub_total + shipping + transaction − discount = our order total
    sub_total: subTotal,
    shipping_charges: order.shippingFee || 0,
    transaction_charges: order.codFee || 0,
    total_discount: order.discount || 0,
    length: pkg.lengthCm,
    breadth: pkg.breadthCm,
    height: pkg.heightCm,
    weight: pkg.weightKg,
  };
}

const busyOrders = new Set();
const SHIPMENT_RESET = {
  awb: null, courierId: null, courierName: null, charge: null, status: null, pickupScheduledAt: null, pickupToken: null,
  labelUrl: null, manifestUrl: null, trackUrl: null, etd: null, activities: [], rto: false, closed: false,
  deliveredAt: null, cancelledAt: null, lastSyncedAt: null, lastError: null,
};

const loadOrder = (id) => db.order.findUnique({ where: { id }, include: { items: true, shipment: true } });

/**
 * Book the order with the chosen courier: Shiprocket order (once) → AWB → pickup → label.
 * Every step is saved as soon as it succeeds, so a retry continues where it stopped.
 */
export async function createShipment(orderId, { courierId, rate, pkg: pkgInput }, actor) {
  if (busyOrders.has(orderId)) throw new HttpError(409, "This order is already being booked — wait a few seconds");
  busyOrders.add(orderId);
  try {
    const cfg = await requireReadyConfig();
    let order = await loadOrder(orderId);
    if (!order) throw new HttpError(404, "Order not found");
    if (!SHIPPABLE.includes(order.status)) throw new HttpError(409, "Only orders that are placed, confirmed or packed can be shipped");
    let sh = order.shipment;
    if (sh?.awb && !sh.cancelledAt) throw new HttpError(409, `Already booked — AWB ${sh.awb}`);
    const pkg = normalisePackage(pkgInput, cfg);

    // 1. Shiprocket order (reuse the existing one unless it was cancelled)
    if (!sh || sh.cancelledAt || !sh.srShipmentId) {
      const attempt = sh ? (sh.cancelledAt ? sh.attempt + 1 : sh.attempt) : 1;
      const channelOrderId = attempt > 1 ? `${order.orderNumber}-R${attempt}` : order.orderNumber;
      const r = await sr("/orders/create/adhoc", { method: "POST", body: orderPayload(order, cfg, pkg, channelOrderId) });
      if (!r?.shipment_id) throw new HttpError(400, `Shiprocket did not create the order: ${errorText(r) || "unknown error"}`);
      const data = {
        attempt, channelOrderId, srOrderId: String(r.order_id), srShipmentId: String(r.shipment_id),
        weightKg: pkg.weightKg, lengthCm: pkg.lengthCm, breadthCm: pkg.breadthCm, heightCm: pkg.heightCm,
      };
      sh = await db.shipment.upsert({
        where: { orderId },
        create: { orderId, ...data, status: "NEW", activities: [] },
        update: { ...SHIPMENT_RESET, ...data, status: "NEW" },
      });
    }

    // 2. AWB with the chosen courier
    const a = await sr("/courier/assign/awb", { method: "POST", body: { shipment_id: Number(sh.srShipmentId), courier_id: Number(courierId) } });
    const d = a?.response?.data;
    if (a?.awb_assign_status !== 1 || !d?.awb_code) {
      const msg = d?.awb_assign_error || errorText(a) || "The courier could not assign an AWB — try another courier";
      await db.shipment.update({ where: { id: sh.id }, data: { lastError: msg } });
      throw new HttpError(400, msg);
    }
    const awb = String(d.awb_code);
    const courierName = d.courier_name || "Courier";
    sh = await db.shipment.update({
      where: { id: sh.id },
      data: {
        awb, courierId: Number(d.courier_company_id) || Number(courierId), courierName,
        charge: Number.isFinite(Number(rate)) ? Number(rate) : null,
        status: "AWB ASSIGNED", trackUrl: `https://shiprocket.co/tracking/${awb}`,
        pickupScheduledAt: d.pickup_scheduled_date || null, lastError: null,
      },
    });

    // our order: courier + tracking, and move to Packed (ready for pickup)
    order = await loadOrder(orderId);
    const who = actor?.name ? ` (by ${actor.name})` : "";
    await updateOrder(orderId, {
      ...(ORDER_FLOW.indexOf(order.status) < ORDER_FLOW.indexOf("PACKED") ? { status: "PACKED" } : {}),
      courier: courierName,
      trackingNumber: awb,
      note: `Booked on Shiprocket${who}: ${courierName} · AWB ${awb}${sh.charge ? ` · ₹${sh.charge}` : ""}`,
    }, { name: "Shiprocket" });

    // 3 + 4. pickup and label — failures here are recoverable from the order page
    if (cfg.autoPickup) await requestPickup(sh).catch(() => {});
    await makeLabel(sh).catch(() => {});
    return db.shipment.findUnique({ where: { id: sh.id } });
  } finally {
    busyOrders.delete(orderId);
  }
}

export async function requestPickup(sh) {
  try {
    const r = await sr("/courier/generate/pickup", { method: "POST", body: { shipment_id: [Number(sh.srShipmentId)] } });
    const resp = r?.response || {};
    return db.shipment.update({
      where: { id: sh.id },
      data: {
        pickupScheduledAt: resp.pickup_scheduled_date || sh.pickupScheduledAt,
        pickupToken: resp.pickup_token_number || null,
        status: sh.status === "AWB ASSIGNED" || sh.status === "NEW" ? "PICKUP SCHEDULED" : sh.status,
        lastError: null,
      },
    });
  } catch (e) {
    // "already in pickup queue" style answers mean the pickup exists
    if (/already|queue/i.test(e.message)) return db.shipment.update({ where: { id: sh.id }, data: { status: "PICKUP SCHEDULED", lastError: null } });
    await db.shipment.update({ where: { id: sh.id }, data: { lastError: `Pickup: ${e.message}` } });
    throw e;
  }
}

export async function makeLabel(sh) {
  const r = await sr("/courier/generate/label", { method: "POST", body: { shipment_id: [Number(sh.srShipmentId)] } });
  if (!r?.label_url) throw new HttpError(400, errorText(r) || "Label not ready yet");
  return db.shipment.update({ where: { id: sh.id }, data: { labelUrl: r.label_url } });
}

export async function makeManifest(sh) {
  let url;
  try {
    url = (await sr("/manifests/generate", { method: "POST", body: { shipment_id: [Number(sh.srShipmentId)] } }))?.manifest_url;
  } catch (e) {
    // already generated → print it instead
    if (!/already/i.test(e.message)) throw e;
  }
  if (!url) url = (await sr("/manifests/print", { method: "POST", body: { order_ids: [Number(sh.srOrderId)] } }))?.manifest_url;
  if (!url) throw new HttpError(400, "Manifest not available yet — request the pickup first");
  return db.shipment.update({ where: { id: sh.id }, data: { manifestUrl: url } });
}

/** Cancel in Shiprocket (only possible before the courier picks it up). The order itself stays as is. */
export async function cancelShipment(orderId, actor) {
  const order = await loadOrder(orderId);
  const sh = order?.shipment;
  if (!sh || sh.cancelledAt) throw new HttpError(404, "No active shipment");
  if (!["PENDING", "CONFIRMED", "PACKED"].includes(order.status)) throw new HttpError(409, "The courier already has this parcel — it can no longer be cancelled here");
  if (sh.srOrderId) await sr("/orders/cancel", { method: "POST", body: { ids: [Number(sh.srOrderId)] } });
  await db.shipment.update({ where: { id: sh.id }, data: { cancelledAt: new Date(), closed: true, status: "CANCELED" } });
  const who = actor?.name ? ` (by ${actor.name})` : "";
  await db.order.update({ where: { id: orderId }, data: { courier: null, trackingNumber: null } });
  await db.orderEvent.create({ data: { orderId, status: order.status, note: `Shiprocket shipment cancelled${who}${sh.awb ? ` · AWB ${sh.awb}` : ""}` } });
}

// ───────────────────────── tracking ─────────────────────────

const norm = (s) => String(s || "").toUpperCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

/** Shiprocket status label → what it means for our order. */
export function mapStatus(label) {
  const s = norm(label);
  if (!s || s === "NA") return {};
  if (s.startsWith("RTO")) return { rto: true, order: s === "RTO DELIVERED" ? "CANCELLED" : null, closed: s === "RTO DELIVERED" };
  if (s.startsWith("RETURN")) return {};
  if (/^CANCEL+ED/.test(s)) return { cancelled: true };
  if (s === "DELIVERED") return { order: "DELIVERED", delivered: true, closed: true };
  if (s.includes("OUT FOR DELIVERY")) return { order: "OUT_FOR_DELIVERY" };
  if (/(LOST|DAMAGED|DESTROYED|DISPOSED)/.test(s)) return { problem: true };
  if (/(PICKED UP|SHIPPED|IN TRANSIT|REACHED|DESTINATION|MISROUTED|DELAY|UNDELIVERED|IN FLIGHT|HANDOVER|CUSTOM)/.test(s)) return { order: "SHIPPED", ndr: s.includes("UNDELIVERED") };
  if (/(PICKUP|AWB|MANIFEST|READY TO SHIP|INVOICED|PACKED|BOOKED)/.test(s)) return { order: "PACKED" };
  return {};
}

const istToDate = (str) => {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(:\d{2})?)/.exec(String(str || ""));
  const d = m ? new Date(`${m[1]}T${m[2].length === 5 ? `${m[2]}:00` : m[2]}+05:30`) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

const scanOf = (a) => ({
  date: a.date || null,
  activity: String(a.activity || "").trim(),
  location: String(a.location || "").trim(),
  status: a["sr-status-label"] && a["sr-status-label"] !== "NA" ? a["sr-status-label"] : null,
});

function mergeScans(existing, incoming) {
  const seen = new Set();
  return [...(incoming || []), ...(Array.isArray(existing) ? existing : [])]
    .filter((s) => {
      const k = `${s.date}|${s.activity}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 200);
}

/**
 * Apply a tracking update to the shipment and (if enabled) move our order forward.
 * Only forward moves are made; anything unexpected is logged on the order timeline instead.
 */
async function applyTracking(sh, { label, scans, etd, trackUrl }, source) {
  const cfg = await getShipConfig();
  const m = mapStatus(label);
  const prev = sh.status;
  const incoming = mergeScans([], scans); // newest first (webhooks send oldest first)
  const latest = incoming[0];
  const data = {
    status: label ? norm(label) : sh.status,
    activities: mergeScans(sh.activities, incoming),
    lastSyncedAt: new Date(),
    lastError: null,
    ...(etd ? { etd } : {}),
    ...(trackUrl ? { trackUrl } : {}),
    ...(m.rto ? { rto: true } : {}),
    ...(m.closed ? { closed: true } : {}),
    ...(m.delivered ? { deliveredAt: istToDate(latest?.date) || new Date() } : {}),
    ...(m.cancelled ? { closed: true, cancelledAt: sh.cancelledAt || new Date() } : {}),
  };
  await db.shipment.update({ where: { id: sh.id }, data });
  if (!label || norm(label) === norm(prev)) return;

  const order = await db.order.findUnique({ where: { id: sh.orderId }, select: { id: true, status: true } });
  const where = latest?.location ? ` · ${latest.location}` : "";
  const note = `Shiprocket: ${norm(label)}${where}${m.rto ? " (returning to origin)" : ""}`;
  const target = m.order;
  const forward = target && (target === "CANCELLED" || ORDER_FLOW.indexOf(target) > ORDER_FLOW.indexOf(order.status));
  if (cfg.autoStatus && forward && canTransition(order.status, target)) {
    try {
      await updateOrder(order.id, { status: target, note }, { name: "Shiprocket" });
      return;
    } catch (e) {
      console.error("[shiprocket] status update failed", order.id, e.message);
    }
  }
  await db.orderEvent.create({ data: { orderId: order.id, status: order.status, note: `${note}${source === "webhook" ? "" : " (sync)"}` } });
}

/** Pull the latest tracking for one shipment from Shiprocket. */
export async function refreshTracking(sh) {
  if (!sh?.awb) throw new HttpError(400, "No AWB yet");
  const r = await sr(`/courier/track/awb/${encodeURIComponent(sh.awb)}`);
  const t = r?.tracking_data || {};
  if (t.error && !t.shipment_track_activities) {
    await db.shipment.update({ where: { id: sh.id }, data: { lastSyncedAt: new Date() } });
    return { pending: true, message: t.error };
  }
  const scans = (t.shipment_track_activities || []).map(scanOf);
  const label = scans.find((s) => s.status)?.status || t.shipment_track?.[0]?.current_status || null;
  await applyTracking(sh, { label, scans, etd: t.etd || null, trackUrl: t.track_url || null }, "sync");
  return { pending: false };
}

/** Tracking webhook payload (see Shiprocket docs → Webhooks). Returns false for unknown shipments. */
export async function handleWebhook(p) {
  const awb = p?.awb ? String(p.awb) : null;
  const sh = awb
    ? await db.shipment.findFirst({ where: { awb }, orderBy: { updatedAt: "desc" } })
    : p?.sr_order_id ? await db.shipment.findFirst({ where: { srOrderId: String(p.sr_order_id) } }) : null;
  if (!sh) return false;
  const scans = (Array.isArray(p.scans) ? p.scans : []).map(scanOf);
  await applyTracking(sh, { label: p.shipment_status || p.current_status, scans, etd: p.etd || null }, "webhook");
  return true;
}

/** Refresh every open shipment (oldest sync first). Used by the admin "Sync tracking" button and the timer. */
export async function syncOpenShipments({ limit = 60 } = {}) {
  if (!(await getCredentials())) return { checked: 0, failed: 0, skipped: "not connected" };
  const open = await db.shipment.findMany({
    where: { closed: false, cancelledAt: null, awb: { not: null } },
    orderBy: { lastSyncedAt: { sort: "asc", nulls: "first" } },
    take: limit,
  });
  let failed = 0;
  for (let i = 0; i < open.length; i += 4) {
    const res = await Promise.allSettled(open.slice(i, i + 4).map((sh) => refreshTracking(sh)));
    failed += res.filter((r) => r.status === "rejected").length;
  }
  return { checked: open.length, failed };
}

