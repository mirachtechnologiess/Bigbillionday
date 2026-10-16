import s from "./home.module.css";
import { COLORWAYS } from "@/components/three/colorways";

const TAU = Math.PI * 2;
const pt = (r, a) => [200 + Math.sin(a) * r, 200 - Math.cos(a) * r];

/**
 * Pure SVG rendition of the hero watch. Painted instantly (no JS), so the hero is never empty
 * while WebGL loads, and remains the final visual for reduced-motion / no-WebGL visitors.
 * Tuned for a white page: soft grey halo + a ground shadow instead of a gold glow.
 */
export default function WatchPoster({ colorway = "steel", className = "", style }) {
  const c = COLORWAYS[colorway] || COLORWAYS.steel;
  const id = `wp-${colorway}`;
  return (
    <svg viewBox="0 -150 400 700" className={className} style={style} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#dfe3ea" stopOpacity="0.9" />
          <stop offset="45%" stopColor="#eef0f4" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="22%" stopColor={c.caseColor} />
          <stop offset="55%" stopColor={c.caseColor} stopOpacity="0.55" />
          <stop offset="78%" stopColor={c.caseColor} />
          <stop offset="100%" stopColor="#1a1a1c" />
        </linearGradient>
        <radialGradient id={`${id}-dial`} cx="42%" cy="36%" r="70%">
          <stop offset="0%" stopColor={c.dialColor} stopOpacity="0.55" />
          <stop offset="40%" stopColor={c.dialColor} />
          <stop offset="100%" stopColor="#020303" />
        </radialGradient>
        <linearGradient id={`${id}-strap`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.strapColor} />
          <stop offset="100%" stopColor={c.strapColor} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-strapT`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={c.strapColor} />
          <stop offset="100%" stopColor={c.strapColor} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="35%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.05" />
        </linearGradient>
        <filter id={`${id}-soft`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      <circle className={s.posterGlow} style={{ transformOrigin: "200px 200px" }} cx="200" cy="200" r="210" fill={`url(#${id}-glow)`} />

      {/* strap */}
      <path d="M160 -140 L240 -140 L242 95 L158 95 Z" fill={`url(#${id}-strapT)`} />
      <path d="M158 305 L242 305 L240 540 L160 540 Z" fill={`url(#${id}-strap)`} />
      {/* lugs */}
      {[
        [143, 82],
        [240, 82],
        [143, 290],
        [240, 290],
      ].map(([x, y]) => (
        <rect key={`${x}${y}`} x={x} y={y} width="17" height="30" rx="5" fill={`url(#${id}-metal)`} />
      ))}
      {/* crown */}
      <rect x="306" y="188" width="18" height="24" rx="3" fill={`url(#${id}-metal)`} />
      {/* soft drop shadow so the case lifts off the white page */}
      <circle cx="207" cy="216" r="108" fill="#1f2430" opacity="0.16" filter={`url(#${id}-soft)`} />
      {/* case + bezel */}
      <circle cx="200" cy="200" r="108" fill={`url(#${id}-metal)`} />
      <circle cx="200" cy="200" r="104" fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="1" />
      {Array.from({ length: 60 }, (_, i) => {
        const a = (i / 60) * TAU;
        const [x1, y1] = pt(97, a);
        const [x2, y2] = pt(106, a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000" strokeOpacity="0.28" strokeWidth="1.6" />;
      })}
      {/* dial */}
      <circle cx="200" cy="200" r="90" fill={`url(#${id}-dial)`} />
      {Array.from({ length: 60 }, (_, i) => {
        const a = (i / 60) * TAU;
        const five = i % 5 === 0;
        const [x1, y1] = pt(87, a);
        const [x2, y2] = pt(five ? 81 : 84, a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={five ? c.dialAccent : "#fff"} strokeOpacity={five ? 0.9 : 0.4} strokeWidth={five ? 1.4 : 0.7} />;
      })}
      {Array.from({ length: 12 }, (_, h) => h)
        .filter((h) => h !== 3)
        .map((h) => {
          const a = (h / 12) * TAU;
          const [x, y] = pt(66, a);
          return (
            <rect
              key={h}
              x={x - (h === 0 ? 5 : 2.2)}
              y={y - 7}
              width={h === 0 ? 10 : 4.4}
              height="14"
              rx="1"
              fill={c.handColor}
              transform={`rotate(${(h / 12) * 360} ${x} ${y})`}
            />
          );
        })}
      <rect x="259" y="194" width="14" height="12" fill="#f4efe4" stroke={c.dialAccent} strokeWidth="0.8" />
      <text x="200" y="164" textAnchor="middle" fill={c.dialAccent} fontSize="14" fontStyle="italic" style={{ fontFamily: "var(--font-display)" }}>
        BBD
      </text>
      <text x="200" y="232" textAnchor="middle" fill={c.dialAccent} fontSize="5.5" letterSpacing="1.6" style={{ fontFamily: "var(--font-mono)" }}>
        AUTOMATIC
      </text>
      {/* hands at 10:09 */}
      <g transform="rotate(-55 200 200)">
        <path d="M197 208 L203 208 L202 158 L200 152 L198 158 Z" fill={c.handColor} />
      </g>
      <g transform="rotate(55 200 200)">
        <path d="M198 210 L202 210 L201.4 137 L200 130 L198.6 137 Z" fill={c.handColor} />
      </g>
      <g className={s.secondHand}>
        <rect x="199.4" y="122" width="1.2" height="96" fill="#f2600c" />
        <circle cx="200" cy="140" r="2.4" fill="#d9f5cb" />
      </g>
      <circle cx="200" cy="200" r="3.6" fill="#f2600c" />
      {/* crystal highlight */}
      <circle cx="200" cy="200" r="90" fill={`url(#${id}-glass)`} />
      <path d="M128 160 A80 80 0 0 1 196 118" fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
