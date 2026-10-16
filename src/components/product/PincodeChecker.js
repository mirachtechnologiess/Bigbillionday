"use client";
import { useEffect, useState } from "react";
import { Check, LoaderCircle, MapPin, X } from "lucide-react";

const KEY = "ps-pincode";

export default function PincodeChecker() {
  const [code, setCode] = useState("");
  const [state, setState] = useState({ status: "idle" }); // idle | loading | ok | no | error

  const check = async (value) => {
    const pin = String(value || code).trim();
    if (!/^[1-9]\d{5}$/.test(pin)) {
      setState({ status: "error", message: "Enter a valid 6-digit pincode" });
      return;
    }
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/pincode?code=${pin}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not check");
      try {
        localStorage.setItem(KEY, pin);
      } catch {}
      setState(json.serviceable ? { status: "ok", ...json } : { status: "no", ...json });
    } catch (e) {
      setState({ status: "error", message: e.message });
    }
  };

  // restore last-used pincode
  useEffect(() => {
    let saved = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    if (saved) {
      setCode(saved);
      check(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
        className="flex items-center gap-2 rounded-lg border border-line-2 bg-white pl-3 transition-colors focus-within:border-gold"
      >
        <MapPin size={17} className="shrink-0 text-gold" aria-hidden />
        <label htmlFor="pincode" className="sr-only">
          Delivery pincode
        </label>
        <input
          id="pincode"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Enter delivery pincode"
          className="h-11 min-w-0 flex-1 bg-transparent text-[14px] font-semibold tracking-[0.06em] outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-mute"
        />
        <button type="submit" className="h-11 shrink-0 px-4 text-[14px] font-bold text-gold-2 hover:text-gold">
          {state.status === "loading" ? <LoaderCircle size={14} className="animate-spin" /> : "Check"}
        </button>
      </form>
      <div aria-live="polite" className="min-h-[1.5rem] px-1 pt-2 text-[12.5px]">
        {state.status === "ok" && (
          <p className="flex items-start gap-2 text-bone-2">
            <Check size={14} strokeWidth={1.6} className="mt-0.5 shrink-0 text-lume" />
            <span>
              Delivery by <span className="font-semibold text-bone">{state.eta}</span>
              {state.cod !== false && <span className="text-mute"> · Cash on Delivery available</span>}
            </span>
          </p>
        )}
        {state.status === "no" && (
          <p className="flex items-start gap-2 text-bone-2">
            <X size={14} strokeWidth={1.6} className="mt-0.5 shrink-0 text-ember" />
            {state.message || "We don't deliver to this pincode yet."}
          </p>
        )}
        {state.status === "error" && <p className="text-ember">{state.message}</p>}
      </div>
    </div>
  );
}
