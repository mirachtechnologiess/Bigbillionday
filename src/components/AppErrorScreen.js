"use client";

import { useEffect, useState } from "react";

/**
 * Shared error screen for error.js / global-error.js boundaries.
 *
 * After every deploy the old JavaScript chunks are gone from the server, so a tab (or cached page) from
 * the previous version fails with ChunkLoadError → Next's bare "Application error: a client-side
 * exception". That case is fixed by simply loading the page again, so we do it automatically once
 * (guarded against reload loops) and otherwise show a friendly screen with a Reload button.
 */
const STALE_BUILD = /ChunkLoadError|Loading (CSS )?chunk|dynamically imported module|Importing a module script failed|Failed to load chunk|_next\/static/i;
const GUARD_KEY = "bbd:auto-reload-at";

export default function AppErrorScreen({ error, reset, homeHref = "/" }) {
  const [reloading, setReloading] = useState(false);
  const stale = STALE_BUILD.test(`${error?.name || ""} ${error?.message || ""}`);

  useEffect(() => {
    console.error(error);
    if (!stale) return;
    try {
      const last = Number(sessionStorage.getItem(GUARD_KEY) || 0);
      if (Date.now() - last < 30_000) return; // already tried recently — don't loop
      sessionStorage.setItem(GUARD_KEY, String(Date.now()));
    } catch {}
    setReloading(true);
    window.location.reload();
  }, [error, stale]);

  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "system-ui, sans-serif", background: "#f6f7f9" }}>
      <div style={{ maxWidth: 420, width: "100%", background: "#fff", border: "1px solid rgba(17,24,39,.1)", borderRadius: 16, padding: 28, textAlign: "center", boxShadow: "0 10px 30px -18px rgba(17,24,39,.3)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".12em", color: "#f2600c", textTransform: "uppercase" }}>
          {reloading ? "Updating" : "Something went wrong"}
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "10px 0 8px", color: "#15171c" }}>
          {reloading ? "Loading the latest version…" : stale ? "A new version is available" : "This page couldn’t load"}
        </h1>
        <p style={{ fontSize: 14, color: "#5b616d", margin: "0 0 20px", lineHeight: 1.5 }}>
          {stale
            ? "The site was just updated. Reload to continue — your cart and login are kept."
            : "Please try again. If it keeps happening, reload the page or come back in a minute."}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => (stale || !reset ? window.location.reload() : reset())}
            style={{ height: 44, padding: "0 20px", borderRadius: 999, border: 0, background: "#f2600c", color: "#fff", fontWeight: 700, cursor: "pointer" }}
          >
            {stale ? "Reload" : "Try again"}
          </button>
          <a href={homeHref} style={{ height: 44, padding: "0 20px", borderRadius: 999, border: "1px solid rgba(17,24,39,.16)", color: "#15171c", fontWeight: 600, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            Go to home
          </a>
        </div>
      </div>
    </div>
  );
}
