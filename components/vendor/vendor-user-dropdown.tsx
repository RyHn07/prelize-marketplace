"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AdminDropdown } from "@/components/admin/admin-dropdown";
import { getPgDataClient } from "@/lib/browser-app-client";

type VendorUserDropdownProps = {
  email: string;
  vendorName: string;
  vendorRole: string | null;
};

export default function VendorUserDropdown({ email, vendorName, vendorRole }: VendorUserDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const vendorInitial = vendorName.trim().charAt(0).toUpperCase() || "V";

  const handleLogout = async () => {
    setIsSigningOut(true);

    try {
      await getPgDataClient().auth.signOut();
      router.push("/");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((previous) => !previous);
        }}
        className="dropdown-toggle flex items-center text-gray-700"
      >
        <span className="mr-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#615FFF] text-sm font-semibold text-white">
          {vendorInitial}
        </span>
        <span className="mr-1 block text-sm font-medium">{vendorName}</span>
        <svg
          className={`h-5 w-5 stroke-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AdminDropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="absolute right-0 mt-[17px] flex w-[280px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-xl"
      >
        <div>
          <span className="block text-sm font-medium text-gray-700">{vendorName}</span>
          <span className="mt-0.5 block text-xs uppercase tracking-[0.14em] text-[#615FFF]">{vendorRole ?? "vendor"}</span>
          <span className="mt-1 block text-xs text-gray-500">{email}</span>
        </div>

        <div className="mt-4 flex flex-col gap-1 border-t border-gray-200 pt-3">
          <Link
            href="/vendor/shop-settings"
            onClick={() => setIsOpen(false)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Shop settings
          </Link>
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Return to website
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={isSigningOut}
            className="rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </AdminDropdown>
    </div>
  );
}
