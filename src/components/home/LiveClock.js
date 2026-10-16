"use client";

import { useEffect, useRef } from "react";

const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

/** Mono "IST 14:32:07" ticker. Writes to the DOM directly — no React re-render per second. */
export default function LiveClock({ className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const tick = () => {
      if (ref.current) ref.current.textContent = fmt.format(new Date());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className={`font-mono tabular-nums ${className}`}>
      <span className="mr-2 inline-block size-1.5 translate-y-[-1px] animate-pulse rounded-full bg-lume" aria-hidden="true" />
      IST <span ref={ref}>--:--:--</span>
    </span>
  );
}
