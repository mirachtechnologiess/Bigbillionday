import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small breadcrumb trail used by listing and product pages. */
export function Breadcrumbs({ crumbs = [], className }) {
  if (!crumbs.length) return null;
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-[12.5px] text-mute">
        {crumbs.map((c, i) => (
          <li key={`${c.href || ""}${c.label}`} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight size={13} className="shrink-0" aria-hidden />}
            {c.href && i < crumbs.length - 1 ? (
              <Link href={c.href} className="hover:text-gold-2 hover:underline">
                {c.label}
              </Link>
            ) : (
              <span className="truncate text-bone-2" aria-current={i === crumbs.length - 1 ? "page" : undefined}>
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Compact page head for listing pages: breadcrumb, bold title, one-line description, optional chips (`aside`).
 * `italic` (legacy prop) is appended to the title as plain text; `image` is ignored.
 */
export default function ListingHero({ eyebrow, title, italic, intro, crumbs = [], aside, className }) {
  const heading = [title, italic].filter(Boolean).join(" ").replace(/\.$/, "");
  return (
    <header className={cn("container-lux pt-3 sm:pt-4", className)}>
      <Breadcrumbs crumbs={crumbs} />
      <div className="mt-2 flex flex-col gap-2 sm:mt-3 md:flex-row md:items-end md:justify-between md:gap-6">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-bone sm:text-[26px]">{heading}</h1>
          {(intro || eyebrow) && <p className="mt-1 line-clamp-2 max-w-3xl text-[13.5px] text-bone-2">{intro || eyebrow}</p>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </header>
  );
}
