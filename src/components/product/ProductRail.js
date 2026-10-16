"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ProductCard from "./ProductCard";

const RAIL_SIZES = "(min-width: 768px) 220px, 44vw";

/**
 * Horizontal scroll row of compact product cards.
 * Props: { products, title?, href?, hrefLabel?, className } — the heading row renders only when `title` is given,
 * and "View all" only when `href` is given.
 */
export default function ProductRail({ products = [], title, href, hrefLabel = "View all", className }) {
  const ref = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, products.length]);

  const scrollBy = (dir) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.85), behavior: "smooth" });
  };

  if (!products.length) return null;

  return (
    <section className={cn("relative", className)} aria-label={title || "Products"}>
      {(title || href) && (
        <div className="mb-3 flex items-end justify-between gap-3">
          {title ? <h2 className="text-[18px] font-extrabold tracking-tight text-bone sm:text-[22px]">{title}</h2> : <span />}
          {href && (
            <Link href={href} className="shrink-0 rounded-md px-2 py-1 text-[13.5px] font-bold text-gold-2 hover:bg-gold-3">
              {hrefLabel}
              <ChevronRight size={15} className="-mr-1 ml-0.5 inline align-[-3px]" aria-hidden />
            </Link>
          )}
        </div>
      )}

      <div className="relative">
        <ul
          ref={ref}
          onScroll={measure}
          data-lenis-prevent-wheel
          className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] sm:gap-3 md:mx-0 md:scroll-px-0 md:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {products.map((p, i) => (
            <li key={p.id} className="w-[44vw] max-w-[220px] shrink-0 snap-start md:w-[208px] lg:w-[220px]">
              <ProductCard product={p} index={i} sizes={RAIL_SIZES} />
            </li>
          ))}
        </ul>

        {!edge.start && (
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="absolute -left-3 top-[34%] z-10 hidden h-11 w-11 place-items-center rounded-full border border-line bg-white text-bone shadow-lg transition-colors hover:text-gold-2 md:grid"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        {!edge.end && (
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="absolute -right-3 top-[34%] z-10 hidden h-11 w-11 place-items-center rounded-full border border-line bg-white text-bone shadow-lg transition-colors hover:text-gold-2 md:grid"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>
    </section>
  );
}
