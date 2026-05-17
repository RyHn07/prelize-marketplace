"use client";

import { useAdminBranding } from "./use-admin-branding";

export default function AdminSidebarWidget() {
  const brand = useAdminBranding();

  return (
    <div className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 text-center">
      <h3 className="mb-2 font-semibold text-gray-900">{brand.marketplaceName}</h3>
      <p className="mb-4 text-sm text-gray-500">
        TailAdmin UI patterns are preserved while the navigation is adapted for your marketplace admin workflow.
      </p>
      <div className="flex items-center justify-center rounded-lg bg-[#615FFF] p-3 text-sm font-medium text-white">
        {brand.adminLabel}
      </div>
    </div>
  );
}
