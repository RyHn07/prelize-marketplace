import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";
import PasswordRecoveryRedirect from "@/components/auth/password-recovery-redirect";
import { getResolvedPlatformSettings } from "@/lib/platform-settings-server";
import { createRootMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const settings = await getResolvedPlatformSettings();
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
        <PasswordRecoveryRedirect />
        {children}
      </body>
    </html>
  );
}
