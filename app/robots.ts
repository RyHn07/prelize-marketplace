import type { MetadataRoute } from "next";

import { absoluteUrl, resolveSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/account/",
        "/cart/",
        "/checkout/",
        "/orders/",
        "/vendor/orders/",
        "/vendor/products/",
        "/vendor/cnds/",
        "/vendor/media/",
        "/vendor/brands/",
        "/vendor/categories/",
        "/vendor/pricing-tiers/",
        "/vendor/shop-settings/",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: resolveSiteUrl(),
  };
}
