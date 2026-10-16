"use client";

import { useEffect, useState } from "react";

/** Live "open now" indicator for Mon–Sat 10:00–19:00 IST. Renders after mount to avoid hydration mismatch. */
export default function OpenStatus() {
  const [open, setOpen] = useState(null);

  useEffect(() => {
    const check = () => {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(new Date());
      const get = (t) => parts.find((p) => p.type === t)?.value;
      const mins = Number(get("hour")) * 60 + Number(get("minute"));
      setOpen(get("weekday") !== "Sun" && mins >= 600 && mins < 1140);
    };
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, []);

  if (open === null) return <span className="inline-block h-[22px] w-28" aria-hidden="true" />;

  return (
    <span className="inline-flex items-center gap-2 text-[13px] font-medium" role="status">
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {open && <span className="absolute inset-0 animate-ping rounded-full bg-lume/60" />}
        <span className={`relative h-2 w-2 rounded-full ${open ? "bg-lume" : "bg-mute"}`} />
      </span>
      <span className={open ? "text-lume" : "text-mute"}>{open ? "Support is online now" : "Support is offline — we reply next business day"}</span>
    </span>
  );
}
