import Image from "next/image";
import Link from "next/link";
import s from "./home.module.css";

const inr = new Intl.NumberFormat("en-IN");

/** Compact brand tiles (product photo + name + count + "from ₹x"). brands: getHomeMerch().brandTiles */
export default function BrandStrip({ brands = [] }) {
  if (!brands.length) return null;
  return (
    <ul className={`${s.noBar} -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:gap-3 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 lg:grid-cols-6`}>
      {brands.map((b) => (
        <li key={b.slug} className="w-[150px] shrink-0 md:w-auto">
          <Link
            href={`/brands/${b.slug}`}
            className="group flex items-center gap-3 rounded-xl border border-line bg-white p-2.5 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-gold hover:shadow-[0_10px_24px_-14px_rgb(242_96_12/0.5)]"
          >
            <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-ink-2">
              {b.logo || b.image?.url ? (
                <Image src={b.logo || b.image.url} alt="" fill sizes="48px" className={b.logo ? "object-contain p-1" : "object-cover"} />
              ) : (
                <span className="grid size-full place-items-center text-lg font-extrabold text-gold">{b.name[0]}</span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-bold text-bone group-hover:text-gold-2">{b.name}</span>
              <span className="block truncate text-[11.5px] text-mute">
                {b.count} {b.count === 1 ? "style" : "styles"}
                {b.minPrice ? ` · from ₹${inr.format(b.minPrice)}` : ""}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
