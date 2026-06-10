import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;
const knownSupabaseStorageHostnames = ["gaxgqmsalluqitujcyxv.supabase.co"];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.103"],
  images: {
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      ...knownSupabaseStorageHostnames
        .filter((hostname) => hostname !== supabaseHostname)
        .map((hostname) => ({
          protocol: "https" as const,
          hostname,
          pathname: "/storage/v1/object/public/**",
        })),
      {
        protocol: "https",
        hostname: "natureconservancy-h.assetsadobe.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/a/**",
      },
      {
        protocol: "https",
        hostname: "www.gravatar.com",
        pathname: "/avatar/**",
      },
    ],
  },
};

export default nextConfig;
