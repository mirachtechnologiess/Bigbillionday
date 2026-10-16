/**
 * Simple centred auth layout: a white card with the title and the form.
 * `quote` / `author` are accepted for compatibility but not rendered.
 */
export default function AuthShell({ quote, author, eyebrow, title, children }) {
  return (
    <div className="bg-ink-2 px-4 py-8 sm:py-12">
      <section className="mx-auto w-full max-w-[440px] rounded-xl border border-line bg-white p-5 shadow-sm sm:p-8">
        {eyebrow && <p className="text-[12px] font-semibold uppercase tracking-wide text-gold-2">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-bold text-bone [&_em]:not-italic">{title}</h1>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}
