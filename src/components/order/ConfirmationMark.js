"use client";
import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

/** Green success circle with a checkmark that draws itself. */
export default function ConfirmationMark() {
  const reduce = useReducedMotion();
  const t = (d) => (reduce ? { duration: 0 } : { ...d, ease: EASE });
  return (
    <svg viewBox="0 0 80 80" className="size-16 sm:size-20" role="img" aria-label="Order placed">
      <motion.circle
        cx="40"
        cy="40"
        r="38"
        fill="#0f8a5f"
        initial={{ scale: reduce ? 1 : 0.6, opacity: reduce ? 1 : 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ transformOrigin: "40px 40px", transformBox: "view-box" }}
        transition={t({ duration: 0.4 })}
      />
      <motion.path
        d="M24 41 L35 52 L57 29"
        fill="none"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: reduce ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={t({ delay: 0.3, duration: 0.45 })}
      />
    </svg>
  );
}
