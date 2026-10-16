"use client";

import { Printer } from "lucide-react";

export default function PrintButton({ label = "Print" }) {
  return (
    <button type="button" className="a-btn a-btn-gold" onClick={() => window.print()}>
      <Printer /> {label}
    </button>
  );
}
