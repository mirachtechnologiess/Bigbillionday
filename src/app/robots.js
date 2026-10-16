import { siteUrl } from "@/lib/utils";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/account", "/checkout", "/cart", "/order", "/login", "/register", "/wishlist", "/*?*q="],
      },
    ],
    sitemap: siteUrl("/sitemap.xml"),
    host: siteUrl(),
  };
}
