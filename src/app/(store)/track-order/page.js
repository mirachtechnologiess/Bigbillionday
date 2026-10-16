import PageIntro from "@/components/commerce/PageIntro";
import TrackOrder from "@/components/order/TrackOrder";

export const metadata = {
  title: "Track Your Order",
  description: "Track your watch order in real time with your order number and mobile number.",
  alternates: { canonical: "/track-order" },
};

export default async function TrackOrderPage({ searchParams }) {
  const sp = await searchParams;
  const initial = typeof sp?.orderNumber === "string" ? sp.orderNumber.toUpperCase().slice(0, 30) : "";
  return (
    <div className="container-lux pb-16 pt-5 sm:pt-8">
      <PageIntro title="Track your order" lede="Enter your order number and mobile number to see the latest status." />
      <div className="mt-5">
        <TrackOrder initialOrderNumber={initial} />
      </div>
    </div>
  );
}
