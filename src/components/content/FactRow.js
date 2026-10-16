/**
 * Row of key-fact tiles.
 * facts: [{ label, value, note? }]
 */
export default function FactRow({ facts = [] }) {
  const cols = facts.length >= 4 ? "md:grid-cols-4" : facts.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2";
  return (
    <dl className={`grid grid-cols-2 gap-3 ${cols}`}>
      {facts.map((f) => (
        <div key={f.label} className="min-w-0 rounded-xl border border-line bg-white p-4">
          <dt className="text-[12px] font-medium text-mute">{f.label}</dt>
          <dd className="mt-1 break-words text-lg font-bold text-bone sm:text-xl">{f.value}</dd>
          {f.note && <dd className="mt-1 text-[12px] leading-snug text-bone-2">{f.note}</dd>}
        </div>
      ))}
    </dl>
  );
}
