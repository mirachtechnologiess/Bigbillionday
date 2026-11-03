/**
 * Production only: refresh open courier shipments every 30 minutes — a safety net in case a
 * Shiprocket tracking webhook is missed. Disable with SHIPPING_AUTOSYNC=false.
 */
if (process.env.NODE_ENV === "production" && process.env.SHIPPING_AUTOSYNC !== "false") {
  const run = async () => {
    try {
      const { syncOpenShipments } = await import("./lib/shiprocket");
      const r = await syncOpenShipments();
      if (r.checked) console.log(`[shipping] synced ${r.checked} open shipment(s), ${r.failed} failed`);
    } catch (e) {
      console.error("[shipping] sync failed", e?.message);
    }
  };
  setTimeout(run, 2 * 60_000);
  setInterval(run, 30 * 60_000);
}
