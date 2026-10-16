/** Subtle decorative watch-dial ring (kept for compatibility; not used by default). */
export default function DialMark({ className = "" }) {
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <svg viewBox="0 0 400 400" aria-hidden="true" focusable="false" className={className}>
      <circle cx="200" cy="200" r="196" fill="none" stroke="rgb(17 24 39 / 0.08)" />
      <circle cx="200" cy="200" r="168" fill="none" stroke="#f2600c" strokeOpacity="0.25" />
      {ticks.map((i) => {
        const hour = i % 5 === 0;
        return (
          <line
            key={i}
            x1="200"
            y1={hour ? 10 : 14}
            x2="200"
            y2={hour ? 34 : 22}
            stroke={hour ? "#f2600c" : "rgb(17 24 39 / 0.12)"}
            strokeOpacity={hour ? 0.4 : 1}
            strokeWidth={hour ? 2 : 1}
            transform={`rotate(${i * 6} 200 200)`}
          />
        );
      })}
      <circle cx="200" cy="200" r="3.5" fill="#f2600c" fillOpacity="0.5" />
    </svg>
  );
}
