import Link from "next/link";
import { ArrowRight } from "lucide-react";
import s from "./home.module.css";

const inr = new Intl.NumberFormat("en-IN");
const TONES = [
  { bg: "bg-sun", fg: "text-bone", pat: s.patDotsDark, chip: "bg-bone text-white" },
  { bg: "bg-teal", fg: "text-white", pat: s.patDots, chip: "bg-white text-teal" },
  { bg: "bg-crimson", fg: "text-white", pat: s.patStripes, chip: "bg-white text-crimson" },
  { bg: "bg-forest", fg: "text-white", pat: s.patChecks, chip: "bg-white text-forest" },
];

function bandText(b) {
  if (b.min == null) return { top: "Under", big: `₹${inr.format(b.max)}`, href: `/watches?max=${b.max}` };
  if (b.max == null) return { top: "Premium picks", big: `₹${inr.format(b.min)}+`, href: `/watches?min=${b.min}` };
  return { top: `₹${inr.format(b.min)} to`, big: `₹${inr.format(b.max)}`, href: `/watches?min=${b.min}&max=${b.max}` };
}

/** Colourful "Shop by price" blocks computed from the real price range. bands: [{min,max,count,from}] */
export default function PriceBands({ bands = [] }) {
  if (!bands.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3" style={{ gridTemplateColumns: bands.length === 2 ? "repeat(2,minmax(0,1fr))" : undefined }}>
      {bands.map((b, i) => {
        const t = TONES[i % TONES.length];
        const x = bandText(b);
        return (
          <Link
            key={x.href}
            href={x.href}
            className={`${s.slide} ${t.pat} ${t.bg} ${t.fg} group flex min-h-[132px] flex-col justify-between overflow-hidden rounded-xl p-4 transition-transform duration-300 hover:-translate-y-1 sm:min-h-[150px] sm:p-5 ${
              bands.length === 3 && i === 2 ? "col-span-2 md:col-span-1" : ""
            }`}
          >
            <span>
              <span className="block text-[13px] font-bold uppercase tracking-[0.08em] opacity-90">{x.top}</span>
              <span className="display block text-[clamp(1.9rem,4.4vw,3rem)]">{x.big}</span>
            </span>
            <span className="flex items-center justify-between gap-2">
              <span className={`${t.chip} rounded-full px-2.5 py-0.5 text-[12px] font-bold`}>
                {b.count} {b.count === 1 ? "style" : "styles"}
              </span>
              <span className="inline-flex items-center gap-1 text-[13px] font-bold">
                Shop <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
