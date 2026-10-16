import Link from "next/link";
import PolicyLayout from "@/components/content/PolicyLayout";
import { getSettings } from "@/lib/settings";

const UPDATED = "16 October 2026";

export async function generateMetadata() {
  const { store } = await getSettings();
  return {
    title: `Privacy Policy | ${store.name}`,
    description: `How ${store.name} collects, uses, stores and protects your personal data, in line with the IT Act, 2000 and the Digital Personal Data Protection Act, 2023.`,
    alternates: { canonical: "/privacy-policy" },
  };
}

export default async function PrivacyPolicyPage() {
  const { store } = await getSettings();
  const name = store.name;
  const email = store.email ? <a href={`mailto:${store.email}`}>{store.email}</a> : <Link href="/contact">our contact page</Link>;

  const sections = [
    {
      id: "scope",
      title: "Who we are & this policy",
      content: (
        <>
          <p>
            This Privacy Policy explains how <strong>{name}</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) collects, uses, shares and
            protects personal data when you visit our website, place an order, or contact us. We act as the <strong>Data Fiduciary</strong> for the
            personal data described here.
          </p>
          <p>
            We process personal data in accordance with the Information Technology Act, 2000, the Information Technology (Reasonable Security
            Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, and the <strong>Digital Personal Data Protection Act,
            2023</strong> (DPDP Act), together with the rules notified under it. By using our website you acknowledge this policy.
          </p>
        </>
      ),
    },
    {
      id: "collect",
      title: "Information we collect",
      content: (
        <>
          <p>We collect only what we need to sell, deliver and support your watch:</p>
          <ul>
            <li>
              <strong>Identity & contact:</strong> name, mobile number, email address.
            </li>
            <li>
              <strong>Delivery details:</strong> shipping address, pin code, landmark and any delivery instructions.
            </li>
            <li>
              <strong>Order information:</strong> products purchased, order value, payment method, order and return history.
            </li>
            <li>
              <strong>Payment details:</strong> for online payments, card and UPI details are handled directly by our PCI-DSS compliant payment
              gateway. We never see or store your full card number, CVV or UPI PIN.
            </li>
            <li>
              <strong>Communications:</strong> messages you send through our contact form, email, phone or WhatsApp.
            </li>
            <li>
              <strong>Technical data:</strong> IP address, device and browser type, pages viewed and referring source, collected through cookies
              and similar technologies.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "use",
      title: "How we use your information",
      content: (
        <>
          <p>We use your personal data for the specific purposes for which it was given, namely to:</p>
          <ul>
            <li>process, verify, pack, ship and deliver your orders, and issue GST invoices;</li>
            <li>contact you about your order, delivery, returns, refunds and warranty claims;</li>
            <li>respond to your questions and provide customer support;</li>
            <li>prevent fraud, misuse of Cash on Delivery and other unlawful activity;</li>
            <li>improve our website, product range and service, using aggregated analytics;</li>
            <li>send offers and new arrivals, only where you have opted in. You can opt out at any time;</li>
            <li>comply with tax, accounting and other legal obligations.</li>
          </ul>
        </>
      ),
    },
    {
      id: "cod",
      title: "Cash on Delivery verification",
      content: (
        <>
          <p>
            To keep Cash on Delivery available across India, we verify COD orders by phone call or WhatsApp before dispatch. We may also use
            automated checks (for example, order history, pin code and previous delivery outcomes) to assess the risk of a parcel being refused.
          </p>
          <p>
            Where parcels are repeatedly refused without a valid reason, we may record this against the phone number used and disable Cash on
            Delivery for that number on future orders. You can always contact us to review such a decision.
          </p>
        </>
      ),
    },
    {
      id: "sharing",
      title: "Sharing & disclosure",
      content: (
        <>
          <p>
            <strong>We do not sell or rent your personal data.</strong> We share it only with carefully chosen partners who need it to serve you,
            under contractual confidentiality and security obligations:
          </p>
          <ul>
            <li>courier and logistics partners, to deliver and return your parcels;</li>
            <li>payment gateways and banks, to process online payments and refunds;</li>
            <li>cloud hosting, email, messaging and analytics providers that operate our services;</li>
            <li>government or law-enforcement authorities, where required by law or a valid legal process.</li>
          </ul>
          <p>Some providers may store data on servers outside India, in which case we ensure the transfer is permitted under Indian law.</p>
        </>
      ),
    },
    {
      id: "cookies",
      title: "Cookies",
      content: (
        <>
          <p>
            We use essential cookies to keep your cart, session and preferences working, and analytics cookies to understand how our website is used.
            You can block or delete cookies in your browser settings; however, parts of the store such as the cart and checkout may stop working.
          </p>
        </>
      ),
    },
    {
      id: "retention",
      title: "Data retention",
      content: (
        <>
          <p>
            We keep personal data only for as long as necessary for the purpose it was collected, or as required by law. Order and invoice records are
            retained for the period prescribed under the GST and income-tax laws (generally up to eight years). Contact messages and marketing
            preferences are deleted or anonymised once they are no longer needed.
          </p>
        </>
      ),
    },
    {
      id: "security",
      title: "How we protect your data",
      content: (
        <>
          <p>
            We follow reasonable security practices, including encrypted HTTPS connections, access controls limited to staff who need the data,
            hashed passwords for admin accounts, and regular review of our systems. No method of transmission over the internet is completely
            secure, but we work hard to protect your information and will notify you and the authorities of a personal data breach as required by
            law.
          </p>
        </>
      ),
    },
    {
      id: "rights",
      title: "Your rights",
      content: (
        <>
          <p>Under the DPDP Act, 2023 you have the right to:</p>
          <ul>
            <li>access a summary of the personal data we hold about you and how it is processed;</li>
            <li>correct, complete or update inaccurate or incomplete data;</li>
            <li>request erasure of your data, unless we must retain it by law;</li>
            <li>withdraw consent for processing based on consent, such as marketing, at any time;</li>
            <li>nominate another person to exercise your rights in the event of death or incapacity;</li>
            <li>have your grievances redressed by us, and thereafter approach the Data Protection Board of India.</li>
          </ul>
          <p>To exercise any of these rights, write to us at {email}. We may need to verify your identity before acting on a request.</p>
        </>
      ),
    },
    {
      id: "children",
      title: "Children",
      content: (
        <p>
          Our website is intended for adults. We do not knowingly collect personal data from anyone under 18 without verifiable consent of a parent
          or lawful guardian. If you believe a child has shared data with us, please contact us and we will delete it.
        </p>
      ),
    },
    {
      id: "grievance",
      title: "Grievance officer",
      content: (
        <>
          <p>
            In accordance with the IT Act, 2000 and the DPDP Act, 2023, you may contact our Grievance Officer with any concern regarding your
            personal data at {email}
            {store.phone ? <> or {store.phone}</> : null}. We will acknowledge your complaint within 48 hours and resolve it within 30 days.
          </p>
          {store.address && (
            <p>
              <strong>Postal address:</strong> {store.address}
            </p>
          )}
        </>
      ),
    },
    {
      id: "changes",
      title: "Changes to this policy",
      content: (
        <p>
          We may update this policy from time to time to reflect changes in law or in how we operate. The &ldquo;Last updated&rdquo; date at the top
          shows when it was last revised. Material changes will be highlighted on our website.
        </p>
      ),
    },
  ];

  return (
    <PolicyLayout
      store={store}
      eyebrow="Legal"
      title="Privacy Policy"
      intro={`What ${name} collects, why we collect it, and the control you have over it.`}
      updated={UPDATED}
      facts={[
        { label: "Your data sold", value: "Never", note: "Shared only to deliver your order" },
        { label: "Connection", value: "HTTPS", note: "Encrypted end to end in transit" },
        { label: "Grievances resolved", value: "30 days", note: "Acknowledged within 48 hours" },
        { label: "Framework", value: "DPDP", note: "Act, 2023 and IT Act, 2000" },
      ]}
      sections={sections}
    />
  );
}
