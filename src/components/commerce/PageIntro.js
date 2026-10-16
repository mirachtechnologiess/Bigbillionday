import { cn } from "@/lib/utils";

/**
 * Compact page opener: small eyebrow, bold title, optional one-line lede.
 * `index` is accepted for compatibility but not shown.
 */
export default function PageIntro({ index, eyebrow, title, lede, children, className, size = "lg" }) {
  return (
    <header className={cn("relative", className)}>
      {eyebrow && <p className="text-[12px] font-semibold uppercase tracking-wide text-gold-2">{eyebrow}</p>}
      <h1
        className={cn(
          "mt-1 font-bold text-bone [&_em]:not-italic",
          size === "lg" ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
        )}
      >
        {title}
      </h1>
      {lede && <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-bone-2">{lede}</p>}
      {children}
    </header>
  );
}
