import Image from "next/image";
import Link from "next/link";
import { Watch } from "lucide-react";
import s from "./home.module.css";

const RINGS = ["ring-saffron", "ring-teal", "ring-crimson", "ring-sun", "ring-forest"];
const BGS = ["bg-gold-3", "bg-[#e6f4f3]", "bg-[#fde8ec]", "bg-[#fff6d6]", "bg-[#e5f2ec]"];

/**
 * Flipkart-style round tiles: quick links (deals, budget, new, men/women) + every category,
 * each with a real product photo. Scrolls horizontally on small screens.
 * items: [{ label, href, image?: {url, alt, blurData}, badge? }]
 */
export default function CategoryCircles({ items = [] }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Shop by category" className="border-b border-line bg-white">
      <ul className={`${s.noBar} container-lux flex gap-4 overflow-x-auto py-4 sm:gap-6 lg:justify-between lg:gap-3`}>
        {items.map((it, i) => (
          <li key={it.href} className="shrink-0">
            <Link href={it.href} className="group flex w-[76px] flex-col items-center gap-2 text-center sm:w-[92px]">
              <span
                className={`relative grid size-[68px] place-items-center rounded-full ${BGS[i % BGS.length]} ring-2 ring-offset-2 ring-offset-white ${RINGS[i % RINGS.length]} transition-transform duration-300 group-hover:-translate-y-1 sm:size-[84px]`}
              >
                <span className="relative size-full overflow-hidden rounded-full">
                  {it.image?.url ? (
                    <Image
                      src={it.image.url}
                      alt=""
                      fill
                      sizes="84px"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      placeholder={it.image.blurData ? "blur" : "empty"}
                      blurDataURL={it.image.blurData || undefined}
                    />
                  ) : (
                    <Watch className="absolute inset-0 m-auto text-bone-2" size={28} aria-hidden="true" />
                  )}
                </span>
                {it.badge ? (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ember px-1.5 py-[1px] text-[9.5px] font-extrabold uppercase text-white shadow">
                    {it.badge}
                  </span>
                ) : null}
              </span>
              <span className="line-clamp-2 text-[12px] font-semibold leading-tight text-bone group-hover:text-gold-2 sm:text-[13px]">{it.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
