import { getSettings } from "@/lib/settings";

export default async function manifest() {
  const { store, seo } = await getSettings();
  return {
    name: store.name,
    short_name: store.name.split(" ")[0] || store.name,
    description: seo.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#f2600c",
    categories: ["shopping", "lifestyle"],
    lang: "en-IN",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "All watches", url: "/watches" },
      { name: "New arrivals", url: "/new-arrivals" },
      { name: "Track order", url: "/track-order" },
    ],
  };
}
