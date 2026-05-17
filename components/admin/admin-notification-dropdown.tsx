"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

import type { AdminNotificationItem } from "@/lib/admin-notifications";
import { AdminDropdown } from "./admin-dropdown";
import { useAdminNotifications } from "./use-admin-notifications";

function formatRelativeTime(value: string) {
  const occurredAt = new Date(value).getTime();

  if (Number.isNaN(occurredAt)) {
    return "Just now";
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - occurredAt) / 1000));

  if (diffSeconds < 60) {
    return "Just now";
  }

  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  return new Date(value).toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getCategoryLabel(category: AdminNotificationItem["category"]) {
  switch (category) {
    case "orders":
      return "Order";
    case "products":
      return "Product";
    case "vendors":
      return "Vendor";
    case "brands":
      return "Brand";
    case "categories":
      return "Category";
    case "homepage":
      return "Homepage";
    case "settings":
      return "Settings";
    default:
      return "Activity";
  }
}

function getCategoryTone(category: AdminNotificationItem["category"]) {
  switch (category) {
    case "orders":
      return {
        badge: "bg-amber-100 text-amber-700",
        icon: "bg-amber-500",
      };
    case "products":
      return {
        badge: "bg-sky-100 text-sky-700",
        icon: "bg-sky-500",
      };
    case "vendors":
      return {
        badge: "bg-emerald-100 text-emerald-700",
        icon: "bg-emerald-500",
      };
    case "homepage":
      return {
        badge: "bg-fuchsia-100 text-fuchsia-700",
        icon: "bg-fuchsia-500",
      };
    case "settings":
      return {
        badge: "bg-slate-200 text-slate-700",
        icon: "bg-slate-500",
      };
    default:
      return {
        badge: "bg-[#eef0ff] text-[#615FFF]",
        icon: "bg-[#615FFF]",
      };
  }
}

function getCategoryInitial(category: AdminNotificationItem["category"]) {
  return getCategoryLabel(category).charAt(0).toUpperCase();
}

export default function AdminNotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    items,
    unreadCount,
    loading,
    errorMessage,
    isMarkingRead,
    refresh,
    markAllRead,
    markAsRead,
  } = useAdminNotifications();

  const visibleItems = useMemo(() => items.slice(0, 8), [items]);

  function toggleDropdown() {
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        className="dropdown-toggle relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        onClick={toggleDropdown}
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 z-10 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#615FFF] px-1 text-[10px] font-semibold text-white shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
        <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <AdminDropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[255px] mt-[17px] flex max-h-[560px] w-[380px] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white p-0 shadow-[0_24px_80px_rgba(15,23,42,0.16)] sm:w-[400px] lg:right-0"
      >
        <div className="border-b border-slate-200 bg-gradient-to-br from-slate-50 via-white to-[#f5f6ff] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h5 className="text-xl font-semibold text-slate-900">Notifications</h5>
              <p className="mt-1 text-sm text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} unread marketplace update${unreadCount === 1 ? "" : "s"}`
                  : "Everything is up to date"}
              </p>
            </div>
            <button
              onClick={toggleDropdown}
              className="dropdown-toggle inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              aria-label="Close notifications"
            >
              <svg className="fill-current" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={isMarkingRead || unreadCount === 0}
              className="inline-flex items-center justify-center rounded-full bg-[#615FFF] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isMarkingRead ? "Marking..." : "Mark all as read"}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-0 py-2">
          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {errorMessage}
            </div>
          ) : loading ? (
            <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-500">
              Loading activity...
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
              <p className="text-base font-medium text-slate-900">No recent admin activity</p>
              <p className="mt-2 text-sm text-slate-500">New orders, catalog updates, and homepage changes will appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visibleItems.map((notification) => {
                const tone = getCategoryTone(notification.category);

                return (
                  <li key={notification.id}>
                    <Link
                      href={notification.href}
                      onClick={() => {
                        if (notification.isUnread) {
                          void markAsRead(notification.occurredAt);
                        }
                        closeDropdown();
                      }}
                      className={`block px-4 py-3 transition ${
                        notification.isUnread
                          ? "bg-slate-50"
                          : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="relative mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                          {getCategoryInitial(notification.category)}
                          <span className={`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white ${tone.icon}`} />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold leading-6 text-slate-900">
                              {notification.title}
                            </p>
                            {notification.isUnread ? (
                              <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-[#615FFF]" />
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-sm leading-6 text-slate-600">{notification.body}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className={`inline-flex rounded-full px-2 py-1 font-medium ${tone.badge}`}>
                              {getCategoryLabel(notification.category)}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span>{formatRelativeTime(notification.occurredAt)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-200 bg-white px-4 py-4">
          <Link
            href="/admin/notifications"
            onClick={closeDropdown}
            className="block rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition hover:border-[#615FFF]/35 hover:text-slate-900"
          >
            View all activity
          </Link>
        </div>
      </AdminDropdown>
    </div>
  );
}
