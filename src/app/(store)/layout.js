import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/cart/CartDrawer";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Concierge from "@/components/ai/Concierge";
import JsonLd from "@/components/seo/JsonLd";
import { connection } from "next/server";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }) {
  // Render per request: pages always show live data and builds never need the DB.
  // DB reads are cached via the Next data cache (see lib/catalog.js, lib/settings.js).
  await connection();
  const settings = await getSettings();
  const { store } = settings;
  return (
    <div className="min-h-dvh bg-ink">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "OnlineStore",
            name: store.name,
            url: siteUrl(),
            logo: siteUrl("/logo.png"),
            email: store.email || undefined,
            telephone: store.phone || undefined,
            sameAs: [store.instagram, store.facebook, store.youtube].filter(Boolean),
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: store.name,
            url: siteUrl(),
            potentialAction: {
              "@type": "SearchAction",
              target: `${siteUrl("/watches")}?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />
      <SmoothScroll />
      <Header settings={settings} />
      <main id="main">{children}</main>
      <Footer settings={settings} />
      <CartDrawer settings={settings} />
      {settings.ai.concierge && <Concierge storeName={store.name} whatsapp={store.whatsapp} />}
    </div>
  );
}
