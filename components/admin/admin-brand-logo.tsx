"use client";

import { useAdminBranding } from "./use-admin-branding";

type AdminBrandLogoProps = {
  compact?: boolean;
};

export default function AdminBrandLogo({
  compact = false,
}: AdminBrandLogoProps) {
  const brand = useAdminBranding();

  if (brand.logoUrl) {
    return (
      <img
        src={brand.logoUrl}
        alt={brand.siteShortTitle}
        className={
          compact
            ? "h-9 w-9 rounded-lg object-contain"
            : "h-10 w-auto max-w-[180px] object-contain"
        }
      />
    );
  }

  if (compact) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#615FFF]">
        <span className="text-sm font-semibold text-white">
          {brand.siteShortTitle.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-[#615FFF] px-4 py-3 text-sm font-semibold tracking-wide text-white">
      {brand.adminLabel}
    </div>
  );
}
