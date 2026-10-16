"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyButton({ value, label = "Copy" }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {}
      }}
      className="inline-grid size-8 place-items-center rounded-md text-bone-2 transition hover:bg-gold-3 hover:text-gold-2"
      aria-label={done ? "Copied" : `${label} ${value}`}
    >
      {done ? <Check className="size-3.5 text-lume" strokeWidth={1.5} /> : <Copy className="size-3.5" strokeWidth={1.25} />}
    </button>
  );
}
