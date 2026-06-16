"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import React from "react";

import { AdminDropdown } from "./admin-dropdown";
import { AdminDropdownItem } from "./admin-dropdown-item";
import { useAdminBranding } from "./use-admin-branding";

export default function AdminUserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const brand = useAdminBranding();

  useEffect(() => {
    let isMounted = true;

    const loadAdminUser = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json()) as { user?: { email?: string | null } | null };
        const email = data.user?.email?.trim();

        if (isMounted && email) {
          setAdminEmail(email);
        }
      } catch {
        // Keep a neutral fallback when the session is unavailable.
      }
    };

    void loadAdminUser();

    return () => {
      isMounted = false;
    };
  }, []);

  function toggleDropdown(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    event.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const adminInitial = brand.siteShortTitle.trim().charAt(0).toUpperCase() || "A";

  return (
    <div className="relative">
      <button onClick={toggleDropdown} className="dropdown-toggle flex items-center text-gray-700">
        <span className="mr-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#615FFF] text-sm font-semibold text-white">
          {adminInitial}
        </span>

        <span className="mr-1 block text-sm font-medium">{brand.adminLabel}</span>

        <svg
          className={`stroke-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AdminDropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-xl"
      >
        <div>
          <span className="block text-sm font-medium text-gray-700">{brand.adminLabel}</span>
          <span className="mt-0.5 block text-xs text-gray-500">{adminEmail || "Signed in"}</span>
        </div>

        <ul className="flex flex-col gap-1 border-b border-gray-200 pb-3 pt-4">
          <li>
            <AdminDropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/admin/settings"
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700"
            >
              Account settings
            </AdminDropdownItem>
          </li>
          <li>
            <AdminDropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/admin"
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700"
            >
              Marketplace reports
            </AdminDropdownItem>
          </li>
          <li>
            <AdminDropdownItem
              onItemClick={closeDropdown}
              tag="a"
              href="/admin/customers"
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700"
            >
              Customer directory
            </AdminDropdownItem>
          </li>
        </ul>
        <Link
          href="/"
          className="group mt-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-700"
        >
          Return to website
        </Link>
      </AdminDropdown>
    </div>
  );
}
