import Link from "next/link";
import { Banknote, PackageCheck, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import NewsletterForm from "./NewsletterForm";
import Wordmark from "./Wordmark";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      ["All watches", "/watches"],
      ["Men's watches", "/men"],
      ["Women's watches", "/women"],
      ["Smart watches", "/category/smart-watches"],
      ["New arrivals", "/new-arrivals"],
      ["Brands", "/brands"],
      ["Collections", "/collections"],
    ],
  },
  {
    title: "Help",
    links: [
      ["Track order", "/track-order"],
      ["Shipping policy", "/shipping-policy"],
      ["Returns & refunds", "/return-policy"],
      ["FAQ", "/faq"],
      ["Contact us", "/contact"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About us", "/about"],
      ["My account", "/account"],
      ["Wishlist", "/wishlist"],
      ["Privacy policy", "/privacy-policy"],
      ["Terms of use", "/terms"],
    ],
  },
];

export default function Footer({ settings }) {
  const store = settings?.store || {};
  const free = settings?.shipping?.freeShippingAbove;
  const name = store.name || "BigBillionDay";
  const year = new Date().getFullYear();
  const socials = [
    ["Instagram", store.instagram],
    ["Facebook", store.facebook],
    ["YouTube", store.youtube],
    ["WhatsApp", store.whatsapp ? `https://wa.me/${String(store.whatsapp).replace(/\D/g, "")}` : ""],
  ].filter(([, u]) => u);

  const TRUST = [
    [Banknote, "Cash on Delivery", "Pay when it arrives", "text-lume"],
    [RotateCcw, "Easy 7-day returns", "Simple pickup & refund", "text-gold"],
    [Truck, free ? `Free shipping above ₹${Number(free).toLocaleString("en-IN")}` : "Fast delivery", "Across India", "text-teal"],
    [PackageCheck, "Quality checked", "Before every dispatch", "text-ember"],
  ];

  return (
    <footer className="mt-12 lg:mt-16">
      {/* trust strip */}
      <div className="border-y border-line bg-white">
        <ul className="container-lux grid grid-cols-2 gap-y-4 py-5 lg:grid-cols-4">
          {TRUST.map(([Icon, title, sub, tone]) => (
            <li key={title} className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-2">
                <Icon size={20} className={tone} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-bone sm:text-[14px]">{title}</span>
                <span className="block text-[12px] text-mute">{sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-[#15171c] text-[#c9ccd3]">
        <div className="container-lux grid gap-10 py-10 lg:grid-cols-[1.2fr_2fr] lg:gap-16 lg:py-12">
          <div>
            <Wordmark name={name} light className="text-[32px]" />
            <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-[#9aa0ab]">
              Stylish watches for men &amp; women at honest prices. Quality checked before dispatch and delivered across India with Cash on Delivery.
            </p>
            <p className="mt-6 text-[14px] font-bold text-white">Get deals &amp; new arrivals by email</p>
            <div className="mt-3">
              <NewsletterForm />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <p className="text-[14px] font-bold text-white">{col.title}</p>
                <ul className="mt-3 space-y-2">
                  {col.links.map(([label, href]) => (
                    <li key={href}>
                      <Link href={href} className="text-[13.5px] text-[#aeb3bd] transition-colors hover:text-white hover:underline">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            <div>
              <p className="text-[14px] font-bold text-white">Contact</p>
              <ul className="mt-3 space-y-2 text-[13.5px]">
                {store.email && (
                  <li>
                    <a href={`mailto:${store.email}`} className="text-[#aeb3bd] hover:text-white hover:underline">
                      {store.email.split("@")[0]}<wbr />@{store.email.split("@")[1]}
                    </a>
                  </li>
                )}
                {store.phone && (
                  <li>
                    <a href={`tel:${store.phone}`} className="text-[#aeb3bd] hover:text-white hover:underline">
                      {store.phone}
                    </a>
                  </li>
                )}
                {socials.map(([label, url]) => (
                  <li key={label}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#aeb3bd] hover:text-white hover:underline">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-[#2a2d35]">
          <div className="container-lux flex flex-col gap-3 py-5 text-[12px] text-[#9aa0ab] sm:flex-row sm:items-center sm:justify-between">
            <p>
              &copy; {year} {name}. All rights reserved.
            </p>
            <ul className="flex flex-wrap items-center gap-2">
              <li className="inline-flex items-center gap-1.5 rounded-md bg-lume px-2.5 py-1 font-semibold text-white">
                <Banknote size={13} aria-hidden /> Cash on Delivery
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-md border border-[#3a3e48] px-2.5 py-1">
                <ShieldCheck size={13} aria-hidden /> UPI / Cards &ndash; coming soon
              </li>
              <li className="rounded-md border border-[#3a3e48] px-2.5 py-1">Prices in INR</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
