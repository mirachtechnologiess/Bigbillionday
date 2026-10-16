import Image from "next/image";
import Link from "next/link";
import { Watch } from "lucide-react";

function Thumb({ href, image, label, chip, chipTone = "lume" }) {
  return (
    <Link href={href} className="group block min-w-0">
      <span className="relative block aspect-square overflow-hidden rounded-lg bg-ink-2">
        {image?.url ? (
          <Image
            src={image.url}
            alt={image.alt || label}
            fill
            sizes="(min-width: 1024px) 140px, (min-width: 640px) 22vw, 42vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            placeholder={image.blurData ? "blur" : "empty"}
            blurDataURL={image.blurData || undefined}
          />
        ) : (
          <Watch className="absolute inset-0 m-auto text-mute" size={28} aria-hidden="true" />
        )}
        {chip ? (
          <span className={`absolute left-1.5 top-1.5 rounded px-1.5 py-[2px] text-[10.5px] font-extrabold text-white ${chipTone === "ember" ? "bg-ember" : "bg-lume"}`}>
            {chip}
          </span>
        ) : null}
      </span>
      <span className="mt-1 block truncate text-[12px] font-medium text-bone-2 group-hover:text-gold-2">{label}</span>
    </Link>
  );
}

/**
 * Amazon-style row of four white cards, each a 2×2 of real product photos with a title and "See more".
 * cards: [{ title, href, cta?, items: [{ href, image, label, chip?, chipTone? }] }]
 */
export default function QuadCards({ cards = [] }) {
  const list = cards.filter((c) => c.items?.length >= 2);
  if (!list.length) return null;
  return (
    <section aria-label="Shop highlights" className="bg-cream py-5 sm:py-6">
      <div className="container-lux grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((c) => (
          <div key={c.title} className="flex flex-col rounded-xl bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.06),0_8px_24px_-14px_rgb(0_0_0/0.18)] transition-shadow hover:shadow-[0_2px_4px_rgb(0_0_0/0.06),0_16px_32px_-14px_rgb(0_0_0/0.24)]">
            <h2 className="mb-3 text-[17px] font-extrabold tracking-tight text-bone">{c.title}</h2>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              {c.items.slice(0, 4).map((it, i) => (
                <Thumb key={`${it.href}-${i}`} {...it} />
              ))}
            </div>
            <Link href={c.href} className="mt-auto pt-3 text-[13px] font-bold text-gold-2 hover:underline">
              {c.cta || "See more"}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

