import Link from "next/link";
import { SearchX } from "lucide-react";

/** Simple watch-face icon (kept for older imports). */
export function StoppedDial({ className = "h-40 w-40" }) {
  return (
    <span className={`grid place-items-center rounded-full bg-gold-3 text-gold ${className}`} aria-hidden>
      <SearchX className="h-1/2 w-1/2" strokeWidth={1.6} />
    </span>
  );
}

export default function EmptyState({ clearHref, title = "No watches found", message = "No products match these filters. Try removing a filter or searching for something else." }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-line bg-white px-4 py-14 text-center">
      <StoppedDial className="h-20 w-20" />
      <h2 className="mt-5 text-[20px] font-bold text-bone">{title}</h2>
      <p className="mt-2 max-w-sm text-[14px] text-bone-2">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {clearHref && (
          <Link href={clearHref} className="btn btn-gold btn-sm rounded-lg">
            Clear filters
          </Link>
        )}
        <Link href="/watches" className="btn btn-ghost btn-sm rounded-lg">
          Shop all watches
        </Link>
      </div>
    </div>
  );
}
