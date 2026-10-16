"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1];

/**
 * Accessible accordion. items: [{ q, a, link?: { href, label } }]
 * Answers stay in the DOM (inert when collapsed) so they remain crawlable.
 */
export default function FaqAccordion({ items = [], defaultOpen = -1 }) {
  const uid = useId();
  const [open, setOpen] = useState(() => new Set(defaultOpen >= 0 ? [defaultOpen] : []));

  const toggle = (i) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <ul>
      {items.map((item, i) => {
        const isOpen = open.has(i);
        const btnId = `${uid}-q-${i}`;
        const panelId = `${uid}-a-${i}`;
        return (
          <li key={item.q} className="border-b border-line last:border-b-0">
            <h3>
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(i)}
                className="group flex w-full items-center gap-3 py-3.5 text-left"
              >
                <span
                  className={`flex-1 text-[15px] font-semibold leading-snug transition-colors duration-200 ${
                    isOpen ? "text-gold-2" : "text-bone group-hover:text-gold-2"
                  }`}
                >
                  {item.q}
                </span>
                <motion.span
                  aria-hidden="true"
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className={`grid size-7 shrink-0 place-items-center rounded-full transition-colors duration-200 ${
                    isOpen ? "bg-gold-3 text-gold-2" : "bg-ink-2 text-bone-2"
                  }`}
                >
                  <Plus size={16} strokeWidth={2} />
                </motion.span>
              </button>
            </h3>
            <motion.div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              aria-hidden={!isOpen}
              inert={!isOpen}
              initial={false}
              animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
              transition={{ height: { duration: 0.3, ease: EASE }, opacity: { duration: 0.2, ease: EASE } }}
              className="overflow-hidden"
            >
              <div className="pb-4 pr-2 text-[14px] leading-relaxed text-bone-2 md:pr-12">
                <p>{item.a}</p>
                {item.link && (
                  <Link href={item.link.href} className="mt-2 inline-block text-[13px] font-semibold text-gold-2 hover:underline">
                    {item.link.label}
                  </Link>
                )}
              </div>
            </motion.div>
          </li>
        );
      })}
    </ul>
  );
}
