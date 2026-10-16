"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/** Sticky table of contents with scroll-spy. items: [{ id, title }] */
export default function TocNav({ items = [], label = "Contents" }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  return (
    <nav aria-label={label}>
      <p className="text-[14px] font-bold text-bone">{label}</p>
      <ol className="mt-3 border-l-2 border-line">
        {items.map((item, i) => {
          const isActive = active === item.id;
          return (
            <li key={item.id} className="relative">
              {isActive && (
                <motion.span
                  layoutId="toc-indicator"
                  aria-hidden="true"
                  className="absolute -left-0.5 top-0 h-full w-0.5 bg-gold"
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                />
              )}
              <a
                href={`#${item.id}`}
                aria-current={isActive ? "location" : undefined}
                onClick={() => setActive(item.id)}
                className={`flex gap-2 py-1.5 pl-3 text-[13px] leading-snug transition-colors duration-200 ${
                  isActive ? "font-semibold text-gold-2" : "text-bone-2 hover:text-bone"
                }`}
              >
                <span className={isActive ? "text-gold-2" : "text-mute"}>{i + 1}.</span>
                <span>{item.title}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
