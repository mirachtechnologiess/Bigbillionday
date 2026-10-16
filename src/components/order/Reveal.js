"use client";
import { motion } from "framer-motion";

/** Fade-up on mount with an optional delay (for staged editorial reveals). */
export default function Reveal({ delay = 0, className, children, as = "div" }) {
  const C = motion[as] || motion.div;
  return (
    <C
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </C>
  );
}
