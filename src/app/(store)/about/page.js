import Link from "next/link";
import { ArrowRight, HandCoins, MessageCircle, PackageCheck, RotateCcw, ScanSearch, Truck } from "lucide-react";
import PageHero from "@/components/content/PageHero";
import FactRow from "@/components/content/FactRow";
import { getSettings } from "@/lib/settings";
import { formatINR } from "@/lib/utils";

export async function generateMetadata() {
  const { store } = await getSettings();
  return {
    title: `About ${store.name} — Watches with Cash on Delivery across India`,
    description: `${store.name} sells stylish watches online, quality checks every order before dispatch and delivers across India with Cash on Delivery and easy 7-day returns.`,
    alternates: { canonical: "/about" },
  };
}

const VALUES = [
  {
    icon: ScanSearch,
    title: "Quality checked before dispatch",
    body: "Before packing we check the case, crystal, crown, strap and that the watch is running. If something is not right, it does not ship.",
  },
  {
    icon: HandCoins,
    title: "Cash on Delivery",
    body: "Pay in cash or UPI to the courier at your door. Nothing to pay online in advance.",
  },
  {
    icon: RotateCcw,
    title: "Easy 7-day returns",
    body: "Changed your mind? Return unused watches with tags and packaging intact within 7 days of delivery.",
  },
  {
    icon: PackageCheck,
    title: "Secure packaging",
    body: "Every order is packed securely to reach you safely, with tracked shipping to serviceable pin codes.",
  },
  {
    icon: Truck,
    title: "Live order tracking",
    body: "Follow every step of your order on our tracking page, from confirmation to delivery.",
  },
  {
    icon: MessageCircle,
    title: "Real people to help",
    body: "Questions about sizing, styles or an order are answered by our team, Monday to Saturday.",
  },
];

const PROCESS = [
  { k: "Order", d: "Pick your watch and place the order with Cash on Delivery." },
  { k: "Confirm", d: "A quick call or WhatsApp to confirm your order and address." },
  { k: "Check & pack", d: "Your watch is quality checked and securely packed." },
  { k: "Deliver", d: "Tracked to your door. Pay the courier only when it arrives." },
];

export default async function AboutPage() {
  const { store, shipping } = await getSettings();

  return (
    <div className="bg-ink-2">
      <PageHero
        eyebrow="About us"
        title={`About ${store.name}`}
        intro={`${store.name} is an online watch store for India: stylish watches, quality checked orders and Cash on Delivery.`}
      />

      <div className="container-lux space-y-6 py-6 sm:space-y-8 sm:py-8">
        {/* Story */}
        <section className="rounded-xl border border-line bg-white p-4 sm:p-6">
          <h2 className="text-lg font-bold text-bone">Our story</h2>
          <div className="mt-2 grid gap-3 text-[14px] leading-relaxed text-bone-2 md:grid-cols-2 md:gap-6">
            <p>
              We started {store.name} to make buying a watch online simple. A clear collection of automatics, chronographs, dress and
              everyday watches, with honest photos and descriptions, and every order checked by our team before it leaves us.
            </p>
            <p>
              Because trust should run both ways, we deliver across India on Cash on Delivery. You receive the parcel, and only then do you
              pay. It is a simple promise, and it shapes everything we do.
            </p>
          </div>
        </section>

        {/* Facts */}
        <section aria-label="At a glance">
          <FactRow
            facts={[
              { label: "Cash on Delivery", value: "All India", note: "At serviceable pin codes" },
              { label: "Free shipping above", value: formatINR(shipping.freeShippingAbove), note: "Orders above this value ship free" },
              { label: "Delivery in", value: `${shipping.etaDays} days`, note: "Business days after dispatch" },
              { label: "Returns", value: "7 days", note: "On unused watches with tags intact" },
            ]}
          />
        </section>

        {/* Values */}
        <section>
          <h2 className="text-lg font-bold text-bone sm:text-xl">Why shop with us</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3 rounded-xl border border-line bg-white p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-3 text-gold-2">
                  <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-[15px] font-bold text-bone">{title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-bone-2">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Process */}
        <section>
          <h2 className="text-lg font-bold text-bone sm:text-xl">How it works</h2>
          <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((s, i) => (
              <li key={s.k} className="rounded-xl border border-line bg-white p-4">
                <span className="grid size-7 place-items-center rounded-full bg-gold text-[13px] font-bold text-white">{i + 1}</span>
                <h3 className="mt-2 text-[15px] font-bold text-bone">{s.k}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-bone-2">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA */}
        <section className="rounded-xl border border-gold/30 bg-gold-3 px-4 py-6 text-center sm:px-6">
          <h2 className="text-xl font-bold text-bone">Find your next watch</h2>
          <p className="mx-auto mt-1 max-w-md text-[14px] text-bone-2">Watches for men and women. Delivered across India, paid for on arrival.</p>
          <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Link href="/watches" className="btn btn-gold w-full sm:w-auto">
              Shop all watches <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </Link>
            <Link href="/contact" className="btn btn-ghost w-full sm:w-auto">
              Contact us
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
