"use client";

import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

/**
 * Masked word-by-word text reveal. Renders real text (SEO-safe) as the given tag.
 *   <Reveal as="h2" className="display text-6xl" text={"Time, *curated.*"} />
 * Pass `text` or a string child; "\n" breaks lines; words wrapped in *asterisks* render italic gold.
 */
export default function Reveal({ as = "p", text, children, className, delay = 0, stagger = 0.06, once = true, amount = 0.4, ...rest }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.p;
  const source = typeof text === "string" ? text : typeof children === "string" ? children : null;

  if (source == null) {
    return (
      <Tag className={className} {...rest}>
        <span style={{ display: "block", overflow: "hidden", paddingBottom: "0.08em" }}>
          <motion.span
            style={{ display: "block" }}
            initial={reduce ? false : { y: "110%" }}
            whileInView={{ y: "0%" }}
            viewport={{ once, amount }}
            transition={{ duration: 1.1, ease: EASE, delay }}
          >
            {children}
          </motion.span>
        </span>
      </Tag>
    );
  }

  let wi = 0;
  return (
    <Tag className={className} initial="hidden" whileInView="show" viewport={{ once, amount }} {...rest}>
      {source.split("\n").map((line, li) => (
        <span key={li} style={{ display: "block" }}>
          {line
            .split(" ")
            .filter(Boolean)
            .map((raw, i, arr) => {
              const accent = /^\*[^*]+\*[.,!?]?$/.test(raw);
              const word = accent ? raw.replace(/\*/g, "") : raw;
              const idx = wi++;
              return (
                <span
                  key={i}
                  style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingBottom: "0.12em", marginBottom: "-0.12em" }}
                >
                  <motion.span
                    style={{ display: "inline-block", willChange: "transform", paddingRight: accent ? "0.06em" : undefined }}
                    className={accent ? "italic text-gold-grad" : undefined}
                    variants={{
                      hidden: reduce ? { y: "0%" } : { y: "110%", rotate: 3 },
                      show: { y: "0%", rotate: 0, transition: { duration: 1.05, ease: EASE, delay: delay + idx * stagger } },
                    }}
                  >
                    {word}
                  </motion.span>
                  {i < arr.length - 1 ? " " : null}
                </span>
              );
            })}
        </span>
      ))}
    </Tag>
  );
}

/** Thin hairline that draws itself when scrolled into view. */
export function RevealLine({ className = "", delay = 0, origin = "left" }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden
      className={`block h-px bg-line-2 ${className}`}
      style={{ transformOrigin: origin }}
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 1.4, ease: EASE, delay }}
    />
  );
}

/** Fade-up a block when it enters the viewport. */
export function FadeUp({ as = "div", children, className, delay = 0, y = 40, amount = 0.2, ...rest }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 1.1, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
