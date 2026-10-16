import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import CheckoutForm from "@/components/checkout/CheckoutForm";

export const metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
  alternates: { canonical: "/checkout" },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const addresses = user
    ? await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] })
    : [];
  const { store, shipping, payment } = settings;
  return (
    <div className="container-lux pb-16 pt-5 sm:pt-8">
      <CheckoutForm
        user={user ? { name: user.name, email: user.email, phone: user.phone } : null}
        addresses={addresses.map((a) => ({
          id: a.id,
          name: a.name,
          phone: a.phone,
          line1: a.line1,
          line2: a.line2 || "",
          landmark: a.landmark || "",
          city: a.city,
          state: a.state,
          pincode: a.pincode,
          isDefault: a.isDefault,
        }))}
        settings={{
          store: { name: store.name, whatsapp: store.whatsapp, phone: store.phone, email: store.email },
          shipping,
          payment: { ...payment, razorpayEnabled: Boolean(payment.razorpayEnabled && process.env.RAZORPAY_KEY_ID) },
        }}
      />
    </div>
  );
}
