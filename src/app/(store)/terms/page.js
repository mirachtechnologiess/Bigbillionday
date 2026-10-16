import Link from "next/link";
import PolicyLayout from "@/components/content/PolicyLayout";
import { getSettings } from "@/lib/settings";
import { formatINR } from "@/lib/utils";

const UPDATED = "16 October 2026";

export async function generateMetadata() {
  const { store } = await getSettings();
  return {
    title: `Terms & Conditions | ${store.name}`,
    description: `The terms that govern purchases on ${store.name}: pricing in INR inclusive of GST, Cash on Delivery, cancellations, returns, warranty and governing law.`,
    alternates: { canonical: "/terms" },
  };
}

export default async function TermsPage() {
  const { store, payment, shipping } = await getSettings();
  const name = store.name;
  const email = store.email ? <a href={`mailto:${store.email}`}>{store.email}</a> : <Link href="/contact">our contact page</Link>;

  const sections = [
    {
      id: "acceptance",
      title: "Acceptance of terms",
      content: (
        <>
          <p>
            These Terms & Conditions (&ldquo;Terms&rdquo;) govern your use of the {name} website and any purchase you make through it. By browsing
            the site or placing an order you agree to these Terms, our <Link href="/privacy-policy">Privacy Policy</Link>,{" "}
            <Link href="/shipping-policy">Shipping Policy</Link> and <Link href="/return-policy">Return Policy</Link>.
          </p>
          <p>This document is an electronic record under the Information Technology Act, 2000 and does not require a physical or digital signature.</p>
        </>
      ),
    },
    {
      id: "eligibility",
      title: "Eligibility",
      content: (
        <p>
          You must be at least 18 years of age and capable of entering into a binding contract under the Indian Contract Act, 1872 to place an order.
          If you are under 18, you may use the website only with the involvement of a parent or guardian. You are responsible for keeping the details
          you provide accurate and up to date.
        </p>
      ),
    },
    {
      id: "products",
      title: "Products & descriptions",
      content: (
        <>
          <p>
            We take great care to describe and photograph every watch accurately, including movement, case size, materials and water resistance.
            Minor variations in colour or finish may occur due to lighting and screen settings, and do not constitute a defect.
          </p>
          <p>
            Every product is quality checked before dispatch, and the product page describes exactly what you will receive. Warranty: as listed
            on the product page (where applicable), provided by {name} as the seller.
          </p>
        </>
      ),
    },
    {
      id: "pricing",
      title: "Pricing",
      content: (
        <>
          <p>
            All prices are listed in <strong>Indian Rupees (INR)</strong> and are <strong>inclusive of GST</strong> and other applicable taxes, unless
            stated otherwise. Shipping charges, if any, are shown separately at checkout before you confirm your order. Orders above{" "}
            {formatINR(shipping.freeShippingAbove)} ship free; below that, a flat fee of {formatINR(shipping.flatFee)} applies.
          </p>
          <p>
            Prices and availability may change without notice. If a product is listed at an obviously incorrect price because of a technical or
            typographical error, we may cancel the order and refund any amount paid in full.
          </p>
        </>
      ),
    },
    {
      id: "orders",
      title: "Orders & acceptance",
      content: (
        <p>
          Placing an order is an offer to purchase. A contract is formed only when we dispatch the product. We may decline or cancel any order, for
          example due to stock unavailability, pricing errors, failed verification, an unserviceable pin code or suspected fraud. If any amount was
          paid, it will be refunded in full.
        </p>
      ),
    },
    {
      id: "cod",
      title: "Cash on Delivery",
      content: (
        <>
          <ul>
            <li>
              Cash on Delivery is available on orders up to <strong>{formatINR(payment.codMaxOrder)}</strong>
              {Number(payment.codFee) > 0 ? <>, with a COD fee of {formatINR(payment.codFee)}</> : null}. You may pay the courier in cash or by
              UPI on delivery.
            </li>
            <li>
              Every COD order is confirmed by a <strong>verification call or WhatsApp message</strong> before dispatch. Orders that cannot be verified
              may be cancelled.
            </li>
            <li>
              Refusing a COD parcel without valid reason causes avoidable two-way shipping costs. <strong>Refused COD parcels may lead to Cash on
              Delivery being disabled for that phone number</strong> on future orders.
            </li>
            <li>Please check that the outer packaging is sealed and intact before paying the courier.</li>
          </ul>
        </>
      ),
    },
    {
      id: "payments",
      title: "Online payments",
      content: (
        <p>
          {payment.razorpayEnabled
            ? "Online payments by card, UPI, net banking and wallets are processed securely by our payment gateway partner. We do not store your card or UPI credentials."
            : "Online prepaid payments are being introduced shortly. Until then, orders are placed on Cash on Delivery. When enabled, online payments will be processed securely by our payment gateway partner, and we will not store your card or UPI credentials."}
        </p>
      ),
    },
    {
      id: "cancellation",
      title: "Cancellation",
      content: (
        <p>
          You may cancel your order free of charge at any time <strong>before it is dispatched</strong>, by replying to our verification message or
          writing to {email} with your order number. Once shipped, an order cannot be cancelled; you may instead return it under our{" "}
          <Link href="/return-policy">Return Policy</Link>.
        </p>
      ),
    },
    {
      id: "shipping-returns",
      title: "Shipping, returns & warranty",
      content: (
        <p>
          Delivery timelines, charges and procedures are set out in our <Link href="/shipping-policy">Shipping Policy</Link>. Returns are accepted
          within 7 days of delivery for unused watches with tags and packaging intact, as detailed in our{" "}
          <Link href="/return-policy">Return Policy</Link>. Warranty claims, where a warranty applies, are handled according to the terms
          stated on the product page.
        </p>
      ),
    },
    {
      id: "conduct",
      title: "Acceptable use",
      content: (
        <>
          <p>You agree not to:</p>
          <ul>
            <li>use the website for any unlawful or fraudulent purpose, or place orders with false information;</li>
            <li>attempt to gain unauthorised access to our systems, or interfere with the website&rsquo;s operation;</li>
            <li>scrape, copy or resell our content or products for commercial purposes without written permission;</li>
            <li>post reviews that are false, abusive or not based on a genuine purchase.</li>
          </ul>
        </>
      ),
    },
    {
      id: "ip",
      title: "Intellectual property",
      content: (
        <p>
          All content on this website, including text, photography, graphics, logos and design, belongs to {name} or its licensors and is protected by
          Indian and international law. Brand names and trademarks of the watches we sell belong to their respective owners and are used only to
          identify the products.
        </p>
      ),
    },
    {
      id: "liability",
      title: "Limitation of liability",
      content: (
        <p>
          To the fullest extent permitted by law, {name} shall not be liable for any indirect, incidental or consequential loss arising from the use
          of the website or products. Our total liability for any claim relating to an order shall not exceed the amount you paid for that order.
          Nothing in these Terms limits your rights under the Consumer Protection Act, 2019.
        </p>
      ),
    },
    {
      id: "law",
      title: "Governing law & jurisdiction",
      content: (
        <p>
          These Terms are governed by the laws of India. Any dispute arising from them shall be subject to the exclusive jurisdiction of the competent
          courts at the place where {name} is registered{store.address ? <> ({store.address})</> : null}. We encourage you to contact us first; most
          concerns can be resolved quickly and amicably.
        </p>
      ),
    },
    {
      id: "changes",
      title: "Changes & contact",
      content: (
        <p>
          We may update these Terms from time to time. The version in force at the time of your order applies to that order. Questions about these
          Terms can be sent to {email}.
        </p>
      ),
    },
  ];

  return (
    <PolicyLayout
      store={store}
      eyebrow="Legal"
      title="Terms & Conditions"
      intro={`The agreement between you and ${name} when you shop with us. Clear, fair and written in plain English.`}
      updated={UPDATED}
      facts={[
        { label: "Prices", value: "INR", note: "Inclusive of GST" },
        { label: "Cancellation", value: "Free", note: "Any time before the parcel ships" },
        { label: "COD up to", value: formatINR(payment.codMaxOrder), note: "Verified by call or WhatsApp" },
        { label: "Returns", value: "7 days", note: "Unused, with tags and packaging" },
      ]}
      sections={sections}
    />
  );
}
