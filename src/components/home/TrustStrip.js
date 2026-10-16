import { Banknote, BadgeCheck, Package, RotateCcw, Truck } from "lucide-react";

const inr = new Intl.NumberFormat("en-IN");

/** Honest service promises only (no authenticity / warranty claims). */
export default function TrustStrip({ freeShippingAbove }) {
  const items = [
    { icon: Banknote, title: "Cash on Delivery", sub: "Pay when it arrives", tone: "text-lume bg-[#e5f4ee]" },
    { icon: RotateCcw, title: "Easy 7-day returns", sub: "Hassle-free process", tone: "text-teal bg-[#e6f4f3]" },
    {
      icon: Truck,
      title: freeShippingAbove ? `Free shipping above ₹${inr.format(freeShippingAbove)}` : "Fast delivery",
      sub: "Delivered across India",
      tone: "text-gold-2 bg-gold-3",
    },
    { icon: BadgeCheck, title: "Quality checked", sub: "Inspected before dispatch", tone: "text-crimson bg-[#fde8ec]" },
    { icon: Package, title: "Secure packaging", sub: "Boxed & bubble-wrapped", tone: "text-bone bg-[#fff6d6]" },
  ];
  return (
    <section aria-label="Why shop with us" className="border-y border-line bg-white">
      <ul className="container-lux grid grid-cols-2 gap-x-3 gap-y-4 py-5 sm:grid-cols-3 lg:grid-cols-5">
        {items.map(({ icon: Icon, title, sub, tone }, i) => (
          <li key={title} className={`flex items-center gap-3 ${i === 4 ? "col-span-2 sm:col-span-1" : ""}`}>
            <span className={`grid size-10 shrink-0 place-items-center rounded-full ${tone}`}>
              <Icon size={19} strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-bold leading-tight text-bone">{title}</span>
              <span className="block text-[12px] text-mute">{sub}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
