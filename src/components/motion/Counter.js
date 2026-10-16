"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

const format = (n, { prefix, suffix, locale, decimals }) =>
  `${prefix}${Number(n).toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;

/**
 * Count-up number that runs once when scrolled into view.
 * Server-renders the final value (SEO, no layout shift), then animates from `from`.
 */
export default function Counter({ value = 0, from = 0, duration = 2.2, prefix = "", suffix = "", locale = "en-IN", decimals = 0, className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!inView || reduce || !el) return;
    const opts = { prefix, suffix, locale, decimals };
    const controls = animate(from, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = format(v, opts);
      },
    });
    return () => controls.stop();
  }, [inView, reduce, value, from, duration, prefix, suffix, locale, decimals]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {format(value, { prefix, suffix, locale, decimals })}
    </span>
  );
}
