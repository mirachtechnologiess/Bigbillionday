import { ChevronDown } from "lucide-react";
import PageHero from "./PageHero";
import FactRow from "./FactRow";
import TocNav from "./TocNav";
import HelpPanel from "./HelpPanel";

/**
 * Simple policy page: compact header, key-fact tiles, sticky TOC (desktop),
 * collapsible contents (mobile), sections in a white card.
 *
 * sections: [{ id, title, content: ReactNode }]
 */
export default function PolicyLayout({ eyebrow, title, intro, updated, facts, sections = [], store }) {
  const toc = sections.map(({ id, title: t }) => ({ id, title: t }));

  return (
    <div className="bg-ink-2">
      <PageHero eyebrow={eyebrow} title={title} intro={intro} meta={updated ? <span>Last updated: {updated}</span> : null} />

      <div className="container-lux py-6 sm:py-8">
        {facts?.length > 0 && (
          <section aria-label="Key facts" className="mb-5">
            <FactRow facts={facts} />
          </section>
        )}

        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6">
          <aside className="hidden lg:block">
            <div className="sticky top-[calc(var(--header-h)+1rem)] rounded-xl border border-line bg-white p-4">
              <TocNav items={toc} />
            </div>
          </aside>

          <details className="group rounded-xl border border-line bg-white lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="text-[14px] font-semibold text-bone">
                Contents <span className="font-normal text-mute">({sections.length} sections)</span>
              </span>
              <ChevronDown size={18} strokeWidth={2} aria-hidden="true" className="text-gold transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <ol className="border-t border-line px-4 py-2">
              {toc.map((item, i) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="flex gap-2 py-2 text-[14px] text-bone-2 hover:text-gold-2">
                    <span className="text-mute">{i + 1}.</span>
                    {item.title}
                  </a>
                </li>
              ))}
            </ol>
          </details>

          <div className="min-w-0">
            <article className="rounded-xl border border-line bg-white px-4 py-2 sm:px-6">
              {sections.map((s, i) => (
                <section
                  key={s.id}
                  id={s.id}
                  aria-labelledby={`${s.id}-title`}
                  className="scroll-mt-[calc(var(--header-h)+1rem)] border-b border-line py-5 last:border-b-0"
                >
                  <h2 id={`${s.id}-title`} className="text-lg font-bold text-bone">
                    {i + 1}. {s.title}
                  </h2>
                  <div className="prose-lux mt-2 text-[14px] sm:text-[15px] [&_a]:font-medium [&_a]:text-gold-2 [&_a]:underline [&_a]:underline-offset-2">
                    {s.content}
                  </div>
                </section>
              ))}
            </article>
            <HelpPanel store={store} />
          </div>
        </div>
      </div>
    </div>
  );
}
