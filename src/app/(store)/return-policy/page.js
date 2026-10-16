import Link from "next/link";
import PolicyLayout from "@/components/content/PolicyLayout";
import { getSettings } from "@/lib/settings";

const UPDATED = "16 October 2026";

export async function generateMetadata() {
  const { store } = await getSettings();
  return {
    title: `Return & Refund Policy | ${store.name}`,
    description: `7-day returns on unused watches with tags and packaging intact, 48-hour reporting for damaged or wrong items, and refunds within 5–7 business days at ${store.name}.`,
    alternates: { canonical: "/return-policy" },
  };
}

export default async function ReturnPolicyPage() {
  const { store } = await getSettings();
  const name = store.name;
  const email = store.email ? <a href={`mailto:${store.email}`}>{store.email}</a> : <Link href="/contact">our contact page</Link>;

  const sections = [
    {
      id: "window",
      title: "7-day return window",
      content: (
        <p>
          We want you to love your watch. If it is not right for you, you may request a return within <strong>7 days of delivery</strong>. The
          window is calculated from the delivery date shown in the courier&rsquo;s tracking record.
        </p>
      ),
    },
    {
      id: "eligibility",
      title: "Eligibility",
      content: (
        <>
          <p>To be eligible for a return, the watch must be:</p>
          <ul>
            <li>unused and unworn, in the same condition in which you received it;</li>
            <li>with all original tags, stickers and protective films intact;</li>
            <li>returned in the packaging it was delivered in, with any manuals, invoice and accessories that came with it;</li>
            <li>free of scratches, dents, marks, perfume or any sign of wear.</li>
          </ul>
        </>
      ),
    },
    {
      id: "non-returnable",
      title: "Non-returnable items",
      content: (
        <>
          <p>For hygiene and resale reasons, we cannot accept returns of:</p>
          <ul>
            <li>watches with removed protective films, tags or seals;</li>
            <li>watches with resized or altered straps or bracelets (links removed);</li>
            <li>engraved, personalised or custom-ordered watches;</li>
            <li>products bought during clearance sales marked as non-returnable on the product page;</li>
            <li>items damaged by misuse, accidents, water exposure beyond rated resistance or unauthorised repair.</li>
          </ul>
          <p>
            Tip: if you are unsure about the bracelet fit, ask us before sizing. We are happy to guide you.
          </p>
        </>
      ),
    },
    {
      id: "damaged",
      title: "Damaged, defective or wrong item",
      content: (
        <>
          <p>
            In the rare case that your watch arrives damaged, defective or different from what you ordered, report it within{" "}
            <strong>48 hours of delivery</strong>. Please include:
          </p>
          <ul>
            <li>your order number;</li>
            <li>a clear, continuous, uncut <strong>unboxing video</strong> starting from the sealed parcel with the shipping label visible;</li>
            <li>photos of the issue.</li>
          </ul>
          <p>
            Once verified, we will arrange a free pickup and send a replacement or issue a full refund, including shipping charges. Claims without an
            unboxing video, or reported after 48 hours, may not be accepted.
          </p>
        </>
      ),
    },
    {
      id: "how",
      title: "How to request a return",
      content: (
        <ul>
          <li>
            Write to us at {email} or via our <Link href="/contact">contact page</Link> with your order number and the reason for return.
          </li>
          <li>Our team will confirm eligibility within 1–2 business days and share pickup or shipping instructions.</li>
          <li>Pack the watch securely in the packaging it came in. Do not stick labels or tape directly on the watch or its box.</li>
          <li>Hand the parcel to our courier partner, or self-ship to the address we provide if reverse pickup is unavailable for your pin code.</li>
        </ul>
      ),
    },
    {
      id: "qc",
      title: "Quality check",
      content: (
        <p>
          Every returned watch goes through a quality check at our facility within 2–3 business days of receipt. If the watch does not meet the
          eligibility conditions above, the return will be declined and the watch shipped back to you. {name}&rsquo;s decision after inspection, made
          in good faith, will be final.
        </p>
      ),
    },
    {
      id: "refunds",
      title: "Refunds",
      content: (
        <>
          <ul>
            <li>
              <strong>Cash on Delivery orders:</strong> refunded by <strong>UPI or bank transfer (NEFT/IMPS)</strong> to the account you share with
              us, within <strong>5–7 business days</strong> after the watch passes quality check.
            </li>
            <li>
              <strong>Prepaid orders:</strong> refunded to the original payment method within 5–7 business days after quality check. Your bank may
              take a few additional days to reflect the credit.
            </li>
            <li>
              For change-of-mind returns, the original shipping fee and any COD fee are non-refundable. For damaged, defective or wrong items, the
              entire amount is refunded.
            </li>
          </ul>
          <p>We will notify you by email or WhatsApp once your refund has been initiated.</p>
        </>
      ),
    },
    {
      id: "exchanges",
      title: "Exchanges",
      content: (
        <p>
          We do not offer direct exchanges for change of mind. Simply return the eligible watch for a refund and place a new order for the piece you
          prefer. Replacements are provided for damaged, defective or wrong items, subject to stock.
        </p>
      ),
    },
    {
      id: "cancellations",
      title: "Cancellations",
      content: (
        <p>
          Orders can be cancelled free of charge any time before dispatch. Once dispatched, the order cannot be cancelled, and refusing the parcel at
          the door is not a substitute for a return. Refused COD parcels may lead to Cash on Delivery being disabled for that phone number. See our{" "}
          <Link href="/terms">Terms</Link> and <Link href="/shipping-policy">Shipping Policy</Link> for details.
        </p>
      ),
    },
    {
      id: "warranty",
      title: "Warranty claims",
      content: (
        <p>
          Warranty: as listed on the product page (where applicable). If a product page mentions a warranty, issues that appear after the
          return window are handled by {name} under the terms stated on that page. Contact us and we will guide you through the process.
        </p>
      ),
    },
  ];

  return (
    <PolicyLayout
      store={store}
      eyebrow="Policies"
      title="Return & Refund Policy"
      intro={`If a watch from ${name} is not quite right, here is exactly how returns, replacements and refunds work.`}
      updated={UPDATED}
      facts={[
        { label: "Return window", value: "7 days", note: "Unused, with tags and packaging" },
        { label: "Report damage", value: "48 hrs", note: "With an uncut unboxing video" },
        { label: "Refund in", value: "5–7 days", note: "Business days after quality check" },
        { label: "COD refunds", value: "UPI", note: "Or bank transfer, NEFT / IMPS" },
      ]}
      sections={sections}
    />
  );
}
