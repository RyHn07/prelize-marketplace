import type { Metadata } from "next";

import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/platform-settings";
import type { PlatformSettingsFormValues } from "@/types/platform-settings";

export const SITE_URL_FALLBACK = "https://prelize.com";

export const DEFAULT_SEO_TITLE = "Prelize | Wholesale Products, Sourcing & Cross-Border Trade";

export const DEFAULT_SEO_DESCRIPTION =
  "Prelize helps buyers discover wholesale products, browse marketplace categories, request sourcing quotes, and connect with vendors for cross-border trade.";

export const PUBLIC_NAVIGATION_LINKS = [
  {
    name: "Product List",
    href: "/products",
    description: "Browse wholesale products, prices, categories, vendors, and MOQ options on Prelize.",
  },
  {
    name: "Browse Categories",
    href: "/categories",
    description: "Explore marketplace categories across fashion, agriculture, automotive, business, packaging, construction, and more.",
  },
] as const;

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function resolveSiteUrl(siteUrl?: string | null) {
  const trimmed = siteUrl?.trim();

  if (!trimmed) {
    return SITE_URL_FALLBACK;
  }

  try {
    return stripTrailingSlash(new URL(trimmed).origin);
  } catch {
    return SITE_URL_FALLBACK;
  }
}

export function absoluteUrl(path: string, siteUrl?: string | null) {
  const baseUrl = resolveSiteUrl(siteUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
}

export function createPageMetadata({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
}): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: DEFAULT_PLATFORM_SETTINGS.site_short_title,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export function createRootMetadata(settings: PlatformSettingsFormValues): Metadata {
  const siteTitle = settings.site_title.trim() || DEFAULT_SEO_TITLE;
  const siteShortTitle =
    settings.site_short_title.trim() || settings.marketplace_name.trim() || DEFAULT_PLATFORM_SETTINGS.site_short_title;
  const siteDescription = settings.site_description.trim() || DEFAULT_SEO_DESCRIPTION;
  const siteUrl = resolveSiteUrl(settings.site_url);
  const faviconUrl = settings.favicon_url.trim();
  const shareImageUrl = settings.share_image_url.trim();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: siteTitle,
      template: `%s | ${siteShortTitle}`,
    },
    description: siteDescription,
    applicationName: siteShortTitle,
    keywords: [
      "Prelize",
      "wholesale marketplace",
      "product sourcing",
      "cross-border trade",
      "request quote",
      "B2B marketplace",
      "supplier marketplace",
    ],
    alternates: {
      canonical: siteUrl,
    },
    icons: faviconUrl
      ? {
          icon: [{ url: faviconUrl }],
          shortcut: [{ url: faviconUrl }],
          apple: [{ url: faviconUrl }],
        }
      : undefined,
    openGraph: {
      type: "website",
      title: siteTitle,
      description: siteDescription,
      siteName: siteShortTitle,
      url: siteUrl,
      images: shareImageUrl ? [{ url: shareImageUrl }] : undefined,
    },
    twitter: {
      card: shareImageUrl ? "summary_large_image" : "summary",
      title: siteTitle,
      description: siteDescription,
      images: shareImageUrl ? [shareImageUrl] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export function toJsonLdScriptContent(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
