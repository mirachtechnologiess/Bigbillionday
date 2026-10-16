import PageHero from "@/components/content/PageHero";
import FaqAccordion from "@/components/content/FaqAccordion";
import HelpPanel from "@/components/content/HelpPanel";
import JsonLd from "@/components/seo/JsonLd";
import { getSettings } from "@/lib/settings";
import { formatINR, siteUrl } from "@/lib/utils";

export async function generateMetadata() {
  const { store } = await getSettings();
  return {
    title: `FAQ — Cash on Delivery, Shipping, Returns & Warranty | ${store.name}`,
    description: `Answers on Cash on Delivery, quality checks, warranty, shipping times, returns, refunds and order tracking at ${store.name}.`,
    alternates: { canonical: "/faq" },
  };
}

function buildGroups({ store, shipping, payment }) {
  const fee = formatINR(shipping.flatFee);
  const free = formatINR(shipping.freeShippingAbove);
  const codMax = formatINR(payment.codMaxOrder);
  const codFee = Number(payment.codFee) > 0 ? ` A COD handling fee of ${formatINR(payment.codFee)} applies and is shown at checkout.` : " There is no extra fee for choosing COD.";

  return [
    {
      id: "orders-cod",
      title: "Orders & Cash on Delivery",
      items: [
        {
          q: "How does Cash on Delivery work?",
          a: `Place your order and choose Cash on Delivery at checkout. When the courier arrives, pay the order amount in cash or by UPI directly to the delivery partner. You pay nothing online in advance.${codFee}`,
        },
        {
          q: "Why will I get a call or WhatsApp before my order ships?",
          a: `To protect genuine buyers and keep COD available for everyone, our team confirms every COD order by a short call or WhatsApp message before dispatch. Orders we cannot verify within 48 hours may be cancelled. Please keep your phone reachable after ordering.`,
        },
        {
          q: "Is there a limit on Cash on Delivery orders?",
          a: `Yes. Cash on Delivery is available on orders up to ${codMax}. For orders above this value, please contact us and we will help you complete your purchase.`,
          link: { href: "/contact", label: "Contact us" },
        },
        {
          q: "Can I cancel or change my order?",
          a: "You can cancel or change your order at any time before it is dispatched. Reply to our verification call or message, or write to us with your order number. Once a parcel has shipped it can no longer be cancelled, but you may use our return policy once it arrives.",
        },
        {
          q: "What happens if I refuse a COD parcel?",
          a: "Refused or unaccepted COD parcels cost us two-way shipping. If a parcel is refused without a valid reason, Cash on Delivery may be disabled for that phone number on future orders.",
        },
      ],
    },
    {
      id: "quality",
      title: "Quality & Warranty",
      items: [
        {
          q: "Are the watches checked before dispatch?",
          a: `Yes. Every watch is quality checked by the ${store.name} team before dispatch: we check that it runs, the strap and clasp work, and there is no visible damage. It is then packed securely for delivery. Product photos and descriptions show exactly what you will receive.`,
        },
        {
          q: "Do watches come with a warranty?",
          a: "Warranty: as listed on the product page (where applicable). If a product page mentions a warranty, it covers manufacturing defects in the movement for the period stated there.",
        },
        {
          q: "What does the warranty not cover?",
          a: "Where a warranty applies, it covers manufacturing defects only. It does not cover physical damage, water ingress caused by misuse or opened case-backs, scratched crystals, straps, batteries, normal wear, or repairs carried out by third parties.",
        },
        {
          q: "What comes in the package?",
          a: "Each watch ships in secure packaging with the accessories listed on its product page. Keep the packaging and tags safe, as they are needed if you want to return the watch.",
        },
      ],
    },
    {
      id: "shipping",
      title: "Shipping",
      items: [
        {
          q: "How much does shipping cost?",
          a: `Shipping is free on orders above ${free}. Orders below this value carry a flat shipping fee of ${fee}, shown clearly at checkout before you confirm.`,
        },
        {
          q: "How long will delivery take?",
          a: `Most orders are delivered within ${shipping.etaDays} business days after dispatch. Metro cities are usually quicker, while remote and north-eastern pin codes can take a little longer. We dispatch verified orders within 1–2 business days.`,
        },
        {
          q: "Do you deliver everywhere in India?",
          a: "We ship to most serviceable pin codes across India through reputed courier partners. Your pin code is checked at checkout, and you will be told before ordering if it is not serviceable.",
        },
        {
          q: "How do I track my shipment?",
          a: "As soon as your order ships you receive the courier and tracking details. You can also follow it any time on our tracking page using your order number and phone number.",
          link: { href: "/track-order", label: "Track your order" },
        },
      ],
    },
    {
      id: "returns",
      title: "Returns & Refunds",
      items: [
        {
          q: "What is your return policy?",
          a: "You can request a return within 7 days of delivery for unused watches with tags, protective films and packaging intact. Watches that have been worn, resized, engraved or damaged cannot be returned.",
          link: { href: "/return-policy", label: "Read the full return policy" },
        },
        {
          q: "I received a damaged or wrong item. What should I do?",
          a: "Please report it within 48 hours of delivery with a clear, uncut unboxing video showing the sealed parcel being opened. Write to us with your order number and the video, and we will arrange a free replacement or full refund after review.",
          link: { href: "/contact", label: "Report an issue" },
        },
        {
          q: "How are refunds made for Cash on Delivery orders?",
          a: "Since COD orders are paid in cash or UPI to the courier, refunds are made to your UPI ID or bank account via transfer. Refunds are processed within 5–7 business days after the returned watch passes our quality check.",
        },
        {
          q: "Is shipping refunded on returns?",
          a: "If the item was damaged, defective or incorrect, the full amount including shipping is refunded. For change-of-mind returns, the original shipping fee and any COD fee are non-refundable.",
        },
      ],
    },
    {
      id: "tracking",
      title: "Order Tracking",
      items: [
        {
          q: "Where can I see my order status?",
          a: "Visit the Track Order page and enter your order number together with the phone number used at checkout. You will see every stage from confirmation and packing to shipping and delivery.",
          link: { href: "/track-order", label: "Go to Track Order" },
        },
        {
          q: "Where do I find my order number?",
          a: "Your order number is shown on the confirmation screen right after checkout and in the confirmation message we send you. It usually starts with the letters PS.",
        },
        {
          q: "My tracking has not updated in a while. Should I worry?",
          a: "Courier scans can pause for a day or two, especially over weekends or during transit between hubs. If there has been no movement for more than 3 business days, contact us with your order number and we will chase the courier for you.",
          link: { href: "/contact", label: "Contact support" },
        },
      ],
    },
  ];
}

export default async function FaqPage() {
  const settings = await getSettings();
  const groups = buildGroups(settings);
  const all = groups.flatMap((g) => g.items);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: siteUrl("/faq"),
    mainEntity: all.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return (
    <div className="bg-ink-2">
      <JsonLd data={jsonLd} />
      <PageHero
        eyebrow="Help centre"
        title="Frequently asked questions"
        intro={`Cash on Delivery, quality checks, shipping, returns and tracking at ${settings.store.name}.`}
      >
        <nav aria-label="FAQ topics" className="mt-4 -mx-1 flex flex-wrap gap-2">
          {groups.map((g) => (
            <a key={g.id} href={`#${g.id}`} className="chip bg-white hover:border-gold hover:text-gold-2">
              {g.title}
            </a>
          ))}
        </nav>
      </PageHero>

      <div className="container-lux py-6 sm:py-8">
        <div className="mx-auto max-w-4xl space-y-4">
          {groups.map((g, i) => (
            <section
              key={g.id}
              id={g.id}
              aria-labelledby={`${g.id}-title`}
              className="scroll-mt-[calc(var(--header-h)+1rem)] rounded-xl border border-line bg-white p-4 sm:p-5"
            >
              <h2 id={`${g.id}-title`} className="text-lg font-bold text-bone">
                {g.title}
              </h2>
              <div className="mt-2">
                <FaqAccordion items={g.items} defaultOpen={i === 0 ? 0 : -1} />
              </div>
            </section>
          ))}

          <HelpPanel store={settings.store} title="Didn't find your answer?" />
        </div>
      </div>
    </div>
  );
}
