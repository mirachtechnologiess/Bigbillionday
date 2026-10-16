"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Light fade/slide-up when a section scrolls into view. Content is SSR-rendered and visible without JS. */
export default function FadeIn({ as = "div", children, className, delay = 0, y = 18, ...rest }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
