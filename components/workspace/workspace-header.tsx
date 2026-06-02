"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

import AdminBrandLogo from "@/components/admin/admin-brand-logo";
import { BellIcon } from "@/components/admin/admin-icons";
import { useSidebar } from "@/components/admin/admin-sidebar-context";

type WorkspaceHeaderProps = {
  homeHref: string;
  searchAction: string;
  searchPlaceholder: string;
  userMenu: ReactNode;
  notificationHref?: string;
};

export default function WorkspaceHeader({
  homeHref,
  searchAction,
  searchPlaceholder,
  userMenu,
  notificationHref,
}: WorkspaceHeaderProps) {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-[99999] flex w-full border-b border-gray-200 bg-white">
      <div className="flex grow flex-col items-center justify-between lg:flex-row lg:px-6">
        <div className="flex w-full items-center justify-between gap-2 border-b border-gray-200 px-3 py-3 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          <button
            type="button"
            className="z-[99999] items-center justify-center rounded-lg border border-gray-200 text-gray-500 lg:flex lg:h-11 lg:w-11"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            {isMobileOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6 18 18M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
                <path d="M1 1h14M1 6h8M1 11h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </button>

          <Link href={homeHref} className="lg:hidden">
            <AdminBrandLogo />
          </Link>

          <button
            type="button"
            onClick={() => setApplicationMenuOpen((isOpen) => !isOpen)}
            className="z-[99999] flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 lg:hidden"
            aria-label="Toggle application menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 12h.01M12 12h.01M18 12h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </button>

          <div className="hidden lg:block">
            <form action={searchAction} method="GET">
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="m14.5 14.5 3 3M16 9a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  ref={inputRef}
                  name="search"
                  type="search"
                  placeholder={searchPlaceholder}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#615FFF]/40 focus:outline-none xl:w-[430px]"
                />
                <span className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs text-gray-500">
                  Ctrl K
                </span>
              </div>
            </form>
          </div>
        </div>

        <div
          className={`${isApplicationMenuOpen ? "flex" : "hidden"} w-full items-center justify-between gap-4 px-5 py-4 shadow-md lg:flex lg:justify-end lg:px-0 lg:shadow-none`}
        >
          {notificationHref ? (
            <Link
              href={notificationHref}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Notifications"
            >
              <BellIcon />
            </Link>
          ) : null}
          {userMenu}
        </div>
      </div>
    </header>
  );
}
