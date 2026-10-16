import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** Compact retail section header: bold title, optional extra (e.g. countdown) and a "View all" link. */
export default function SectionHead({ title, href, cta = "View all", id, children, className = "" }) {
  return (
    <div className={`mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id={id} className="text-[18px] font-extrabold tracking-tight text-bone sm:text-[22px]">
          {title}
        </h2>
        {children}
      </div>
      {href ? (
        <Link href={href} className="shrink-0 rounded-md px-2 py-1 text-[13.5px] font-bold text-gold-2 hover:bg-gold-3">
          {cta}
          <ChevronRight size={15} className="-mr-1 ml-0.5 inline align-[-3px]" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
