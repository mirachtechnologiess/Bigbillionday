"use client";

import { useEffect, useRef } from "react";

const IST = 5.5 * 3600 * 1000;
const DAY = 86400000;
const pad = (n) => String(n).padStart(2, "0");

/** Time left until the next midnight in India (IST). */
function left() {
  const ms = DAY - ((Date.now() + IST) % DAY);
  const t = Math.floor(ms / 1000);
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
}

/** "Ends in 05:12:33" pill. Updates the DOM directly once a second (no re-render). */
export default function Countdown({ label = "Ends in", className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const tick = () => {
      if (ref.current) ref.current.textContent = left();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md bg-ember px-2.5 py-1 text-[12.5px] font-bold text-white ${className}`}>
      <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
      {label}{" "}
      <span ref={ref} className="font-mono tabular-nums" role="timer" aria-label="Time left until midnight IST">
        --:--:--
      </span>
    </span>
  );
}
