"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { INDIAN_STATES } from "@/lib/utils";

const noop = () => () => {};
/** true only after hydration — use to render persisted (localStorage) state safely. */
export function useMounted() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false
  );
}

const matchState = (s) => INDIAN_STATES.find((x) => x.toLowerCase() === String(s || "").toLowerCase()) || null;

/**
 * Best-effort pincode → city/state lookup (api.postalpincode.in).
 * Calls onResult({ city, state }) once per new valid pincode. Returns { status: idle|loading|found|missing, place }.
 */
export function usePincodeLookup(pincode, onResult) {
  const [res, setRes] = useState({ status: "idle", place: "" });
  const cb = useRef(onResult);
  useEffect(() => {
    cb.current = onResult;
  });
  const last = useRef("");
  useEffect(() => {
    if (!/^[1-9]\d{5}$/.test(pincode || "")) {
      last.current = "";
      setRes({ status: "idle", place: "" });
      return;
    }
    if (last.current === pincode) return;
    last.current = pincode;
    const ctrl = new AbortController();
    setRes({ status: "loading", place: "" });
    const timer = setTimeout(() => ctrl.abort(), 6000);
    fetch(`https://api.postalpincode.in/pincode/${pincode}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => {
        const po = data?.[0]?.Status === "Success" ? data[0].PostOffice?.[0] : null;
        if (!po) return setRes({ status: "missing", place: "" });
        const city = po.District || po.Block || po.Name;
        const state = matchState(po.State) || (po.State === "Delhi" ? "Delhi" : null);
        setRes({ status: "found", place: [city, state || po.State].filter(Boolean).join(", ") });
        cb.current?.({ city, state });
      })
      .catch(() => {
        if (!ctrl.signal.aborted || last.current === pincode) setRes({ status: "idle", place: "" });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [pincode]);
  return res;
}
