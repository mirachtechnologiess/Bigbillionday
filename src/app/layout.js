import { Instrument_Serif, Manrope, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";
import "./globals.css";

const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
const grotesk = Manrope({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono-face", display: "swap" });

export async function generateMetadata() {
  const { seo, store } = await getSettings();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: seo.title, template: `%s | ${store.name}` },
    description: seo.description,
    keywords: seo.keywords,
    applicationName: store.name,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: store.name,
      locale: "en_IN",
      url: siteUrl(),
      title: seo.title,
      description: seo.description,
      images: [{ url: seo.ogImage, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: seo.title, description: seo.description, images: [seo.ogImage] },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    formatDetection: { telephone: false },
  };
}

export const viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN" className={`${serif.variable} ${grotesk.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          theme="light"
          position="bottom-center"
          toastOptions={{ style: { background: "#fff", border: "1px solid rgba(17,24,39,.12)", color: "#15171c" } }}
        />
      </body>
    </html>
  );
}
