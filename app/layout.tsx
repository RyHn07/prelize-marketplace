import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/platform-settings";
import { getResolvedPlatformSettings } from "@/lib/platform-settings-server";

function toMetadataBase(url: string) {
  if (!url) {
    return undefined;
  }

  try {
    return new URL(url);
  } catch {
    return undefined;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const settings = await getResolvedPlatformSettings();
  const siteTitle = settings.site_title.trim() || DEFAULT_PLATFORM_SETTINGS.site_title;
  const siteShortTitle =
    settings.site_short_title.trim() || settings.marketplace_name.trim() || DEFAULT_PLATFORM_SETTINGS.site_short_title;
  const siteDescription =
    settings.site_description.trim() || DEFAULT_PLATFORM_SETTINGS.site_description;
  const siteUrl = settings.site_url.trim();
  const faviconUrl = settings.favicon_url.trim();
  const shareImageUrl = settings.share_image_url.trim();

  return {
    metadataBase: toMetadataBase(siteUrl),
    title: {
      default: siteTitle,
      template: `%s | ${siteShortTitle}`,
    },
    description: siteDescription,
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
      url: siteUrl || undefined,
      images: shareImageUrl ? [{ url: shareImageUrl }] : undefined,
    },
    twitter: {
      card: shareImageUrl ? "summary_large_image" : "summary",
      title: siteTitle,
      description: siteDescription,
      images: shareImageUrl ? [shareImageUrl] : undefined,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col font-sans antialiased">{children}</body>
    </html>
  );
}
