/**
 * Compact page header: optional small eyebrow, bold title, one-line intro, optional meta line.
 * Server component.
 */
export default function PageHero({ eyebrow, title, intro, meta, children }) {
  return (
    <header className="border-b border-line bg-ink-2">
      <div className="container-lux py-6 sm:py-8">
        {eyebrow && <p className="text-[12px] font-semibold uppercase tracking-wide text-gold-2">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-bold text-bone sm:text-3xl">{title}</h1>
        {intro && <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-bone-2 sm:text-[15px]">{intro}</p>}
        {meta && <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-mute">{meta}</p>}
        {children}
      </div>
    </header>
  );
}
