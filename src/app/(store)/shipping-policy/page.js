import Link from "next/link";
import PolicyLayout from "@/components/content/PolicyLayout";
import { getSettings } from "@/lib/settings";
import { formatINR } from "@/lib/utils";

const UPDATED = "16 October 2026";

export async function generateMetadata() {
  const { store, shipping } = await getSettings();
  return {
    title: `Shipping Policy | ${store.name}`,
    description: `Free shipping above ${formatINR(shipping.freeShippingAbove)}, delivery in ${shipping.etaDays} business days, Cash on Delivery across India and live order tracking at ${store.name}.`,
    alternates: { canonical: "/shipping-policy" },
  };
}

export default async function ShippingPolicyPage() {
  const { store, shipping, payment } = await getSettings();
  const name = store.name;
  const free = formatINR(shipping.freeShippingAbove);
  const fee = formatINR(shipping.flatFee);
  const email = store.email ? <a href={`mailto:${store.email}`}>{store.email}</a> : <Link href="/contact">our contact page</Link>;

  const sections = [
    {
      id: "coverage",
      title: "Where we ship",
      content: (
        <p>
          {name} ships across India through reputed courier partners. We deliver to most serviceable pin codes, including metros, towns and many
          rural areas. Your pin code is checked at checkout, and you will be told before placing an order if it is not serviceable. We do not ship
          internationally at this time.
        </p>
      ),
    },
    {
      id: "charges",
      title: "Shipping charges",
      content: (
        <>
          <ul>
            <li>
              <strong>Free shipping</strong> on all orders above {free}.
            </li>
            <li>
              A flat shipping fee of <strong>{fee}</strong> applies to orders of {free} or less.
            </li>
            {payment.codEnabled && (
              <li>
                {Number(payment.codFee) > 0
                  ? <>Cash on Delivery orders carry a COD handling fee of {formatINR(payment.codFee)}.</>
                  : <>There is no additional fee for Cash on Delivery.</>}
              </li>
            )}
          </ul>
          <p>All charges are shown clearly at checkout before you confirm your order. Prices are inclusive of GST.</p>
        </>
      ),
    },
    {
      id: "processing",
      title: "Order processing",
      content: (
        <>
          <p>
            Orders are processed Monday to Saturday, excluding public holidays. Once your order is confirmed, each watch is physically inspected,
            time-set, packed in secure packaging and dispatched within <strong>1–2 business days</strong>.
          </p>
          <p>Orders placed after 17:00 IST, or on Sundays and holidays, are processed on the next business day.</p>
        </>
      ),
    },
    {
      id: "cod-verification",
      title: "Cash on Delivery verification",
      content: (
        <p>
          Before dispatching a Cash on Delivery order, our team confirms it with you by a <strong>short call or WhatsApp message</strong>. This
          protects genuine buyers and keeps COD available to everyone. Orders that cannot be verified within 48 hours may be cancelled. COD is
          available on orders up to {formatINR(payment.codMaxOrder)}.
        </p>
      ),
    },
    {
      id: "timelines",
      title: "Delivery timelines",
      content: (
        <>
          <p>
            Most orders are delivered within <strong>{shipping.etaDays} business days</strong> after dispatch. Metro cities are usually faster,
            while remote locations, hill states and the north-east may take a few extra days.
          </p>
          <p>
            Delivery timelines are estimates. Delays can occasionally occur due to weather, strikes, festivals, regional restrictions or courier
            disruptions beyond our control. We will keep you informed if your parcel is delayed.
          </p>
        </>
      ),
    },
    {
      id: "tracking",
      title: "Tracking your order",
      content: (
        <p>
          As soon as your watch ships you will receive the courier name and tracking number. You can also follow your order at any time on our{" "}
          <Link href="/track-order">Track Order</Link> page using your order number and the phone number used at checkout.
        </p>
      ),
    },
    {
      id: "delivery",
      title: "Delivery attempts & refused parcels",
      content: (
        <>
          <p>
            The courier will usually attempt delivery up to three times and may call you before each attempt. Please make sure your address and phone
            number are correct and that someone is available to receive the parcel.
          </p>
          <p>
            If a parcel is returned to us after failed attempts or is refused at the door without a valid reason, the order will be cancelled.
            <strong> Refused COD parcels may lead to Cash on Delivery being disabled for that phone number</strong> on future orders. For prepaid
            orders, the amount is refunded after deducting the forward and return shipping costs.
          </p>
        </>
      ),
    },
    {
      id: "damaged",
      title: "Damaged or tampered parcels",
      content: (
        <p>
          Please check that the outer packaging is sealed and undamaged before accepting the parcel. If it appears tampered with, you may refuse
          delivery and inform us immediately. If you notice damage after opening, report it within <strong>48 hours</strong> with an uncut unboxing
          video, as described in our <Link href="/return-policy">Return Policy</Link>.
        </p>
      ),
    },
    {
      id: "address",
      title: "Changing your address",
      content: (
        <p>
          Your delivery address can be changed only before the order is dispatched. Contact us at {email} with your order number as soon as possible.
          Once a parcel has shipped we cannot redirect it.
        </p>
      ),
    },
  ];

  return (
    <PolicyLayout
      store={store}
      eyebrow="Policies"
      title="Shipping Policy"
      intro={`How ${name} packs, ships and delivers your watch anywhere in India, and what to expect at every step.`}
      updated={UPDATED}
      facts={[
        { label: "Free shipping above", value: free, note: `Flat ${fee} below that` },
        { label: "Delivered in", value: `${shipping.etaDays} days`, note: "Business days after dispatch" },
        { label: "Dispatch within", value: "48 hrs", note: "After order verification" },
        { label: "Pay on delivery", value: "COD", note: `Cash or UPI, up to ${formatINR(payment.codMaxOrder)}` },
      ]}
      sections={sections}
    />
  );
}
