import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildHref } from "./params";

function pageWindow(page, pages) {
  const set = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

/** Crawlable pagination: plain <a> links carrying the full filter state. */
export default function Pagination({ basePath, params, page, pages }) {
  if (pages <= 1) return null;
  const href = (p) => buildHref(basePath, { ...params, page: p });
  const edge = "flex h-10 items-center gap-1.5 rounded-lg border border-line-2 bg-white px-3.5 text-[13px] font-bold transition-colors";
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-2 rounded-xl border border-line bg-white p-2.5 sm:p-3">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={cn(edge, "text-bone hover:border-gold hover:text-gold-2")}>
          <ArrowLeft size={14} strokeWidth={2} /> <span className="hidden sm:inline">Prev</span>
        </Link>
      ) : (
        <span className={cn(edge, "text-mute opacity-40")} aria-hidden>
          <ArrowLeft size={14} strokeWidth={2} /> <span className="hidden sm:inline">Prev</span>
        </span>
      )}

      <ol className="flex items-center gap-1">
        {pageWindow(page, pages).map((p) =>
          typeof p === "string" ? (
            <li key={p} className="px-1 text-[13px] text-mute">
              ···
            </li>
          ) : (
            <li key={p}>
              <Link
                href={href(p)}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-full text-[13.5px] font-semibold transition-colors",
                  p === page ? "bg-gold text-white" : "text-bone-2 hover:bg-ink-2 hover:text-bone"
                )}
              >
                {p}
              </Link>
            </li>
          )
        )}
      </ol>

      {page < pages ? (
        <Link href={href(page + 1)} rel="next" className={cn(edge, "text-bone hover:border-gold hover:text-gold-2")}>
          <span className="hidden sm:inline">Next</span> <ArrowRight size={14} strokeWidth={2} />
        </Link>
      ) : (
        <span className={cn(edge, "text-mute opacity-40")} aria-hidden>
          <span className="hidden sm:inline">Next</span> <ArrowRight size={14} strokeWidth={2} />
        </span>
      )}
    </nav>
  );
}
