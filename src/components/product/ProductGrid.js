import { cn } from "@/lib/utils";
import ProductCard, { ProductCardSkeleton } from "./ProductCard";
import ProductRail from "./ProductRail";

export { ProductCardSkeleton, ProductRail };

/**
 * Column presets (compact retail grid).
 * 6 = full-width pages (default) · 5 = next to a filter sidebar · 4/3 = narrow containers.
 */
const COLS = {
  6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
  5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  3: "grid-cols-2 sm:grid-cols-3",
};

export const GRID_GAP = "gap-2 sm:gap-3";

/** Responsive grid of compact ProductCards. The first `priorityCount` cards load eagerly (LCP). */
export default function ProductGrid({ products = [], cols = 6, priorityCount = 0, className }) {
  return (
    <ul className={cn("grid", GRID_GAP, COLS[cols] || COLS[6], className)}>
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} index={i} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 12, cols = 6, className }) {
  return (
    <ul className={cn("grid", GRID_GAP, COLS[cols] || COLS[6], className)}>
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <ProductCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
