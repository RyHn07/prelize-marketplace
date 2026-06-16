import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/platform-settings";
import { getResolvedPlatformSettings } from "@/lib/platform-settings-server";
import { createRootMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const settings = await getResolvedPlatformSettings().catch(() => DEFAULT_PLATFORM_SETTINGS);
  return createRootMetadata(settings);
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
