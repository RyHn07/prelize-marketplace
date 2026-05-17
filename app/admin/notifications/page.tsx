"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import AdminEmptyState from "@/components/admin/admin-empty-state";
import { useAdminNotifications } from "@/components/admin/use-admin-notifications";

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

function getCategoryLabel(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
        fill="currentColor"
      />
    </svg>
  );
}

type NotificationFilter = "all" | "unread" | "read";

export default function AdminNotificationsPage() {
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<NotificationFilter>("all");

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return items.filter((notification) => {
      const matchesFilter =
        filterMode === "all" ||
        (filterMode === "unread" ? notification.isUnread : !notification.isUnread);
      const matchesSearch =
        query.length === 0 ||
        notification.title.toLowerCase().includes(query) ||
        notification.body.toLowerCase().includes(query) ||
        notification.category.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [filterMode, items, searchQuery]);

  return (
    <section className="w-full space-y-6">
      <div className="overflow-hidden rounded-[20px] border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-base font-medium text-gray-800">Notifications List</h3>
              <p className="mt-1 text-sm text-gray-500">
                Review recent catalog, order, vendor, homepage, and settings activity from one workspace.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <div className="rounded-lg bg-[#615FFF]/8 px-3 py-2 text-sm font-medium text-[#615FFF]">
                {filteredItems.length} visible
              </div>
              <button
                type="button"
                onClick={() => void markAllRead()}
                disabled={isMarkingRead || unreadCount === 0}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-[#615FFF] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isMarkingRead ? "Marking..." : "Mark all as read"}
              </button>
              <button
                type="button"
                onClick={() => void refresh()}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-[380px]">
              <label htmlFor="notification-search" className="sr-only">
                Search notifications
              </label>
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                <SearchIcon />
              </span>
              <input
                id="notification-search"
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by title, category, or activity text"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="w-full sm:w-48">
                <label htmlFor="notification-filter" className="sr-only">
                  Filter notifications
                </label>
                <select
                  id="notification-filter"
                  value={filterMode}
                  onChange={(event) => setFilterMode(event.target.value as NotificationFilter)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
                >
                  <option value="all">All Types</option>
                  <option value="unread">Unread Only</option>
                  <option value="read">Read Only</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFilterMode("all");
                }}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="border-b border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600 sm:px-6">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="bg-white p-8 text-center text-sm text-slate-500">Loading notifications...</div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No notifications yet"
              description="Recent marketplace activity will appear here once orders, catalog changes, or homepage updates happen."
              action={
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Back to Dashboard
                </Link>
              }
            />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No matching notifications"
              description="Try another search term or change the notification filter."
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredItems.map((notification) => (
              <Link
                key={notification.id}
                href={notification.href}
                onClick={() => {
                  if (notification.isUnread) {
                    void markAsRead(notification.occurredAt);
                  }
                }}
                className={`block px-5 py-5 transition hover:bg-gray-50 sm:px-6 ${
                  notification.isUnread ? "bg-[#f7f7ff]" : "bg-white"
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm font-semibold text-gray-800 sm:text-base">{notification.title}</p>
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {getCategoryLabel(notification.category)}
                      </span>
                      {notification.isUnread ? (
                        <span className="inline-flex rounded-full bg-[#615FFF] px-3 py-1 text-xs font-semibold text-white">
                          Unread
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-gray-500">{notification.body}</p>
                  </div>

                  <p className="shrink-0 text-xs font-medium text-gray-500 lg:pt-1">
                    {formatRelativeTime(notification.occurredAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
