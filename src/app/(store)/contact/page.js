import Link from "next/link";
import { ArrowUpRight, Clock, Instagram, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import PageHero from "@/components/content/PageHero";
import ContactForm from "@/components/content/ContactForm";
import OpenStatus from "@/components/content/OpenStatus";
import { getSettings } from "@/lib/settings";

export async function generateMetadata() {
  const { store } = await getSettings();
  return {
    title: `Contact ${store.name} — Customer Support`,
    description: `Talk to the ${store.name} team about watches, Cash on Delivery orders, shipping or returns. Email, phone, WhatsApp or send us a message.`,
    alternates: { canonical: "/contact" },
  };
}

const HOURS = [
  { d: "Monday – Friday", h: "10:00 – 19:00" },
  { d: "Saturday", h: "10:00 – 19:00" },
  { d: "Sunday & public holidays", h: "Closed" },
];

function waLink(num) {
  let digits = String(num || "").replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  return digits ? `https://wa.me/${digits}` : null;
}

function instaHandle(url) {
  const m = String(url || "").match(/instagram\.com\/([^/?#]+)/i);
  return m ? `@${m[1]}` : url;
}

export default async function ContactPage() {
  const { store } = await getSettings();
  const wa = waLink(store.whatsapp);

  const channels = [
    store.email && { icon: Mail, label: "Email", value: store.email, href: `mailto:${store.email}`, note: "Replies within one business day" },
    store.phone && { icon: Phone, label: "Call", value: store.phone, href: `tel:${store.phone.replace(/[^\d+]/g, "")}`, note: "Mon – Sat, 10:00 – 19:00 IST" },
    wa && { icon: MessageCircle, label: "WhatsApp", value: store.whatsapp, href: wa, note: "Fastest for order updates", external: true },
    store.instagram && { icon: Instagram, label: "Instagram", value: instaHandle(store.instagram), href: store.instagram, note: "New arrivals and wrist shots", external: true },
  ].filter(Boolean);

  return (
    <div className="bg-ink-2">
      <PageHero
        eyebrow="Customer support"
        title="Contact us"
        intro="Questions about a watch, a Cash on Delivery order or a return? Write to us and a real person will reply."
      >
        <div className="mt-3">
          <OpenStatus />
        </div>
      </PageHero>

      <section className="container-lux grid gap-5 py-6 sm:py-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
        {/* Channels */}
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-white">
            <h2 className="border-b border-line px-4 py-3 text-[16px] font-bold text-bone sm:px-5">Reach us directly</h2>
            <ul>
              {channels.map(({ icon: Icon, label, value, href, note, external }) => (
                <li key={label} className="border-b border-line last:border-b-0">
                  <a
                    href={href}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-2 sm:px-5"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-3 text-gold-2">
                      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] text-mute">{label}</span>
                      <span className="block break-words text-[15px] font-semibold text-bone group-hover:text-gold-2">{value}</span>
                      <span className="block text-[12px] text-bone-2">{note}</span>
                    </span>
                    <ArrowUpRight size={18} strokeWidth={2} aria-hidden="true" className="shrink-0 text-mute group-hover:text-gold" />
                    {external && <span className="sr-only">(opens in a new tab)</span>}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {store.address && (
            <div className="flex gap-3 rounded-xl border border-line bg-white p-4 sm:p-5">
              <MapPin size={18} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0 text-gold" />
              <div>
                <p className="text-[14px] font-bold text-bone">Registered address</p>
                <address className="mt-1 whitespace-pre-line text-[14px] not-italic leading-relaxed text-bone-2">{store.address}</address>
                {store.gstin && <p className="mt-1 font-mono text-[12px] text-mute">GSTIN {store.gstin}</p>}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-line bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Clock size={16} strokeWidth={2} aria-hidden="true" className="text-gold" />
              <p className="text-[14px] font-bold text-bone">Business hours (IST)</p>
            </div>
            <dl className="mt-2 divide-y divide-line">
              {HOURS.map((r) => (
                <div key={r.d} className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="text-[14px] text-bone-2">{r.d}</dt>
                  <dd className={`text-[14px] font-medium ${r.h === "Closed" ? "text-mute" : "text-bone"}`}>{r.h}</dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="text-[13px] leading-relaxed text-bone-2">
            Checking on an order?{" "}
            <Link href="/track-order" className="font-semibold text-gold-2 hover:underline">
              Track it instantly
            </Link>{" "}
            or browse our{" "}
            <Link href="/faq" className="font-semibold text-gold-2 hover:underline">
              FAQs
            </Link>
            .
          </p>
        </div>

        {/* Form */}
        <div className="h-fit rounded-xl border border-line bg-white p-4 sm:p-6">
          <h2 className="text-lg font-bold text-bone">Send us a message</h2>
          <p className="mb-5 mt-1 text-[14px] leading-relaxed text-bone-2">Include your order number if your question is about an existing order.</p>
          <ContactForm />
        </div>
      </section>
    </div>
  );
}
