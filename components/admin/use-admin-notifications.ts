"use client";

import { useCallback, useEffect, useState } from "react";

import { getSupabaseClient } from "@/lib/supabase-client";
import type { AdminNotificationItem } from "@/lib/admin-notifications";

type NotificationResponse = {
  data: AdminNotificationItem[];
  unreadCount: number;
  lastReadAt: string;
  error?: string;
};

async function getAccessToken() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function authorizedNotificationFetch<T>(input: string, init?: RequestInit) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("Please login first.");
  }

  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => null)) as T | { error?: string } | null;

  if (!response.ok) {
    throw new Error((body as { error?: string } | null)?.error ?? "Unable to load notifications.");
  }

  return body as T;
}

export function useAdminNotifications() {
  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadAt, setLastReadAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const result = await authorizedNotificationFetch<NotificationResponse>("/api/admin/notifications");
      setItems(result.data);
      setUnreadCount(result.unreadCount);
      setLastReadAt(result.lastReadAt);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setIsMarkingRead(true);

    try {
      const result = await authorizedNotificationFetch<{ lastReadAt: string }>("/api/admin/notifications", {
        method: "POST",
        body: JSON.stringify({ action: "mark_all_read" }),
      });

      setLastReadAt(result.lastReadAt);
      setItems((current) => current.map((item) => ({ ...item, isUnread: false })));
      setUnreadCount(0);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to mark notifications as read.");
    } finally {
      setIsMarkingRead(false);
    }
  }, []);

  const markAsRead = useCallback(async (occurredAt: string) => {
    try {
      const result = await authorizedNotificationFetch<{ lastReadAt: string }>("/api/admin/notifications", {
        method: "POST",
        body: JSON.stringify({ action: "mark_read_up_to", occurredAt }),
        keepalive: true,
      });

      setLastReadAt(result.lastReadAt);
      const nextReadBoundary = new Date(result.lastReadAt).getTime();

      setItems((current) => {
        const nextItems = current.map((item) => ({
          ...item,
          isUnread: new Date(item.occurredAt).getTime() > nextReadBoundary,
        }));

        setUnreadCount(nextItems.filter((item) => item.isUnread).length);
        return nextItems;
      });
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to mark notification as read.");
    }
  }, []);

  useEffect(() => {
    void refresh();

    const intervalId = window.setInterval(() => {
      void refresh();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  return {
    items,
    unreadCount,
    lastReadAt,
    loading,
    errorMessage,
    isMarkingRead,
    refresh,
    markAllRead,
    markAsRead,
  };
}
