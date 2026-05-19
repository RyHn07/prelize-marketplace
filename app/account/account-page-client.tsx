"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase-client";

type AccountOrderSummary = {
  payNow?: number;
};

type AccountOrder = {
  id: string;
  order_number: string;
  status: string | null;
  payment_status?: string | null;
  created_at: string;
  summary?: AccountOrderSummary | null;
};

type OrderFilterKey =
  | "all"
  | "pending"
  | "confirmed"
  | "delivered"
  | "cancel"
  | "paid"
  | "unpaid";

type AccountView = "dashboard" | "messages" | "orders" | "coupons" | "settings";

const ORDER_FILTERS: Array<{ key: OrderFilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "delivered", label: "Delivered" },
  { key: "cancel", label: "Cancel" },
  { key: "paid", label: "Paid" },
  { key: "unpaid", label: "Unpaid" },
];

function DashboardIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="6" height="6" rx="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 7.5h12A1.5 1.5 0 0 1 19.5 9v6A1.5 1.5 0 0 1 18 16.5H10l-4 3v-3H6A1.5 1.5 0 0 1 4.5 15V9A1.5 1.5 0 0 1 6 7.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OrderIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="6.5" y="4.5" width="11" height="15" rx="2" />
      <path d="M9 9h6M9 13h6M9 17h4" strokeLinecap="round" />
    </svg>
  );
}

function CouponIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 7.5h10A1.5 1.5 0 0 1 18.5 9v2a2 2 0 0 0 0 4v2A1.5 1.5 0 0 1 17 18.5H7A1.5 1.5 0 0 1 5.5 17v-2a2 2 0 0 0 0-4V9A1.5 1.5 0 0 1 7 7.5Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8.5v7" strokeLinecap="round" strokeDasharray="1.8 2.2" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8.5" r="3.25" />
      <path d="M6.5 19.5a5.5 5.5 0 0 1 11 0" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M10 7.5H7.5A1.5 1.5 0 0 0 6 9v6a1.5 1.5 0 0 0 1.5 1.5H10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 15.5 17 12l-4-3.5M17 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatOrderDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatBDT(amount: number) {
  return `৳${amount.toLocaleString()}`;
}

function getDisplayName(user: User) {
  const fromMetadata =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";

  if (fromMetadata.trim()) {
    return fromMetadata.trim();
  }

  if (typeof user.email === "string" && user.email.includes("@")) {
    return user.email.split("@")[0].toUpperCase();
  }

  return "PRELIZE USER";
}

function getUserInitial(user: User) {
  return getDisplayName(user).trim().charAt(0).toUpperCase() || "U";
}

function getAvatarUrl(user: User) {
  if (typeof user.user_metadata?.avatar_url === "string" && user.user_metadata.avatar_url.trim()) {
    return user.user_metadata.avatar_url;
  }

  if (typeof user.user_metadata?.picture === "string" && user.user_metadata.picture.trim()) {
    return user.user_metadata.picture;
  }

  return "";
}

function matchesOrderFilter(order: AccountOrder, filter: OrderFilterKey) {
  const status = (order.status ?? "").trim().toLowerCase();
  const paymentStatus = (order.payment_status ?? "").trim().toLowerCase();

  switch (filter) {
    case "pending":
      return status === "pending";
    case "confirmed":
      return status === "confirmed";
    case "delivered":
      return status === "delivered";
    case "cancel":
      return status === "cancel" || status === "cancelled" || status === "canceled";
    case "paid":
      return paymentStatus === "received" || paymentStatus === "paid";
    case "unpaid":
      return paymentStatus === "pending" || paymentStatus === "unpaid" || paymentStatus === "";
    default:
      return true;
  }
}

export default function AccountPageClient() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterKey, setFilterKey] = useState<OrderFilterKey>("all");
  const [activeView, setActiveView] = useState<AccountView>("dashboard");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadAccount = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (authError) {
        setUser(null);
        setOrders([]);
        setErrorMessage(authError.message);
        setLoading(false);
        return;
      }

      const currentUser = authData.user ?? null;

      if (!isMounted) {
        return;
      }

      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      const { data: userIdOrders, error: userIdOrdersError } = await supabase
        .from("orders")
        .select("id, order_number, status, payment_status, created_at, summary")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (userIdOrdersError) {
        setOrders([]);
        setErrorMessage(userIdOrdersError.message);
        setLoading(false);
        return;
      }

      let fetchedOrders = (userIdOrders ?? []) as AccountOrder[];

      if (fetchedOrders.length === 0 && currentUser.email) {
        const { data: emailOrders, error: emailOrdersError } = await supabase
          .from("orders")
          .select("id, order_number, status, payment_status, created_at, summary")
          .eq("user_email", currentUser.email)
          .order("created_at", { ascending: false });

        if (!isMounted) {
          return;
        }

        if (emailOrdersError) {
          setOrders([]);
          setErrorMessage(emailOrdersError.message);
          setLoading(false);
          return;
        }

        fetchedOrders = (emailOrders ?? []) as AccountOrder[];
      }

      setOrders(fetchedOrders);
      setErrorMessage("");
      setLoading(false);
    };

    void loadAccount();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    setIsSigningOut(true);

    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesOrderFilter(order, filterKey)),
    [filterKey, orders],
  );

  const totalOrders = orders.length;
  const unreadMessages = 0;
  const coupons = 0;
  const avatarUrl = user ? getAvatarUrl(user) : "";
  const displayName = user ? getDisplayName(user) : "";
  const recentOrders = orders.slice(0, 4);

  const sidebarItemClass = (isActive: boolean) =>
    `flex w-full items-center gap-3 rounded-[8px] px-4 py-3 text-left text-[15px] transition ${
      isActive
        ? "bg-[#615FFF] font-semibold text-white shadow-[0_18px_30px_rgba(97,95,255,0.22)]"
        : "text-slate-700 hover:bg-slate-50"
    }`;

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-[8px] border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-[0_24px_60px_rgba(15,23,42,0.05)]">
            Loading your account...
          </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl rounded-[8px] border border-slate-200 bg-white px-8 py-12 text-center shadow-[0_24px_60px_rgba(15,23,42,0.05)]">
            <h1 className="text-3xl font-semibold text-slate-950">My Account</h1>
            <p className="mt-3 text-sm text-slate-500">Please login to access your account dashboard.</p>

            <Link
              href="/login"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[#615FFF] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(97,95,255,0.25)] transition hover:bg-[#5552f0]"
            >
              Go to Login
            </Link>
          </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start">
          <aside className="flex p-5 lg:sticky lg:top-6 lg:box-border lg:h-[calc(100vh-3rem)]">
            <div className="flex h-full w-full flex-col gap-8">
              <div className="space-y-8">
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveView("dashboard")}
                    className={sidebarItemClass(activeView === "dashboard")}
                  >
                    <DashboardIcon />
                    <span>Dashboard</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Options</p>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setActiveView("messages")}
                      className={sidebarItemClass(activeView === "messages")}
                    >
                      <MessageIcon />
                      <span>Messages</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView("orders")}
                      className={sidebarItemClass(activeView === "orders")}
                    >
                      <OrderIcon />
                      <span>Orders</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView("coupons")}
                      className={sidebarItemClass(activeView === "coupons")}
                    >
                      <CouponIcon />
                      <span>Coupons</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Settings</p>
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => setActiveView("settings")}
                      className={sidebarItemClass(activeView === "settings")}
                    >
                      <SettingsIcon />
                      <span>Account Settings</span>
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isSigningOut}
                className="mt-auto flex w-full items-center justify-center gap-3 rounded-[8px] bg-[#ef4444] px-4 py-3 text-[15px] font-semibold text-white transition hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:bg-[#fca5a5]"
              >
                <LogoutIcon />
                <span>{isSigningOut ? "Logging out..." : "Logout"}</span>
              </button>
            </div>
          </aside>

          <div className="space-y-6">
            <section className="rounded-[8px] border border-white/80 bg-white px-6 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.05)] sm:px-7">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#615FFF] via-[#7a78ff] to-[#19d3c5] text-lg font-semibold text-white shadow-[0_20px_40px_rgba(97,95,255,0.28)]">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt={displayName} fill sizes="64px" className="object-cover" />
                    ) : (
                      <span>{getUserInitial(user)}</span>
                    )}
                  </div>

                  <div>
                    <h1 className="text-[28px] font-semibold uppercase leading-none text-slate-950">
                      {displayName}
                    </h1>
                    <p className="mt-2 text-base text-slate-600">{user.email}</p>
                  </div>
                </div>

                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-[8px] border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[#615FFF]/25 hover:text-[#615FFF]"
                >
                  Start sourcing
                </Link>
              </div>

              <div className="mt-8 grid gap-5 border-t border-slate-100 pt-8 md:grid-cols-3 md:divide-x md:divide-slate-200">
                <div className="text-center">
                  <p className="text-4xl font-semibold text-slate-950">{unreadMessages}</p>
                  <p className="mt-2 text-sm text-slate-600">Unread messages</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-semibold text-slate-950">{totalOrders}</p>
                  <p className="mt-2 text-sm text-slate-600">Total Orders</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-semibold text-slate-950">{coupons}</p>
                  <p className="mt-2 text-sm text-slate-600">Coupons</p>
                </div>
              </div>
            </section>
            {activeView === "dashboard" ? (
              <section className="rounded-[8px] border border-white/80 bg-white px-6 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.05)] sm:px-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-[22px] font-semibold text-slate-950">Orders</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Track your recent marketplace orders from one dashboard.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveView("orders")}
                    className="text-sm font-medium text-[#615FFF] transition hover:text-[#4f4ce6]"
                  >
                    View all orders
                  </button>
                </div>

                {errorMessage ? (
                  <div className="mt-8 rounded-[8px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="flex min-h-[340px] flex-col items-center justify-center text-center">
                    <h3 className="text-[21px] font-semibold text-slate-950">No orders yet</h3>
                    <p className="mt-3 max-w-md text-sm text-slate-500">
                      You have not placed any marketplace orders yet. Start browsing products to place your first order.
                    </p>

                    <Link
                      href="/products"
                      className="mt-8 inline-flex items-center justify-center rounded-full border border-slate-900 px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-950 hover:text-white"
                    >
                      Start sourcing
                    </Link>
                  </div>
                ) : (
                  <div className="mt-8 space-y-4">
                    {recentOrders.map((order) => (
                      <Link
                        key={order.id}
                        href={`/orders/${order.id}`}
                        className="flex flex-col gap-4 rounded-[8px] border border-slate-200 px-5 py-5 transition hover:border-[#615FFF]/25 hover:shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Order</p>
                          <p className="text-lg font-semibold text-slate-950">{order.order_number || order.id.slice(0, 8)}</p>
                          <p className="text-sm text-slate-500">{formatOrderDate(order.created_at)}</p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 sm:items-center sm:gap-8">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Status</p>
                            <p className="mt-1 text-sm font-medium text-slate-900">{order.status ?? "Pending"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Payment</p>
                            <p className="mt-1 text-sm font-medium text-slate-900">{order.payment_status ?? "Pending"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Amount</p>
                            <p className="mt-1 text-sm font-medium text-[#615FFF]">
                              {formatBDT(order.summary?.payNow ?? 0)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {activeView === "orders" ? (
              <section className="rounded-[8px] border border-white/80 bg-white px-6 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.05)] sm:px-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-[22px] font-semibold text-slate-950">Orders</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Review all your marketplace orders without leaving the account dashboard.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveView("dashboard")}
                    className="text-sm font-medium text-[#615FFF] transition hover:text-[#4f4ce6]"
                  >
                    Back to dashboard
                  </button>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {ORDER_FILTERS.map((filter) => {
                    const isActive = filter.key === filterKey;

                    return (
                      <button
                        key={filter.key}
                        type="button"
                        onClick={() => setFilterKey(filter.key)}
                        className={`inline-flex rounded-full border px-5 py-2.5 text-sm font-medium transition ${
                          isActive
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>

                {errorMessage ? (
                  <div className="mt-8 rounded-[8px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                  </div>
                ) : null}

                {filteredOrders.length === 0 ? (
                  <div className="flex min-h-[340px] flex-col items-center justify-center text-center">
                    <h3 className="text-[21px] font-semibold text-slate-950">
                      {orders.length === 0 ? "No orders yet" : "No matching orders"}
                    </h3>
                    <p className="mt-3 max-w-md text-sm text-slate-500">
                      {orders.length === 0
                        ? "You have not placed any marketplace orders yet. Start browsing products to place your first order."
                        : "No orders match the selected status right now. Try another tab to review more activity."}
                    </p>

                    <Link
                      href={orders.length === 0 ? "/products" : "/account"}
                      className="mt-8 inline-flex items-center justify-center rounded-full border border-slate-900 px-6 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-950 hover:text-white"
                    >
                      {orders.length === 0 ? "Start sourcing" : "Back to dashboard"}
                    </Link>
                  </div>
                ) : (
                  <div className="mt-8 space-y-4">
                    {filteredOrders.map((order) => (
                      <Link
                        key={order.id}
                        href={`/orders/${order.id}`}
                        className="flex flex-col gap-4 rounded-[8px] border border-slate-200 px-5 py-5 transition hover:border-[#615FFF]/25 hover:shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Order</p>
                          <p className="text-lg font-semibold text-slate-950">{order.order_number || order.id.slice(0, 8)}</p>
                          <p className="text-sm text-slate-500">{formatOrderDate(order.created_at)}</p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 sm:items-center sm:gap-8">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Status</p>
                            <p className="mt-1 text-sm font-medium text-slate-900">{order.status ?? "Pending"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Payment</p>
                            <p className="mt-1 text-sm font-medium text-slate-900">{order.payment_status ?? "Pending"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Amount</p>
                            <p className="mt-1 text-sm font-medium text-[#615FFF]">
                              {formatBDT(order.summary?.payNow ?? 0)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {activeView === "messages" ? (
              <section className="rounded-[8px] border border-white/80 bg-white px-6 py-16 text-center shadow-[0_24px_60px_rgba(15,23,42,0.05)] sm:px-7">
                <h2 className="text-[22px] font-semibold text-slate-950">Messages</h2>
                <p className="mt-3 text-sm text-slate-500">Messaging UI is not connected yet. This section is ready for your next design step.</p>
              </section>
            ) : null}

            {activeView === "coupons" ? (
              <section className="rounded-[8px] border border-white/80 bg-white px-6 py-16 text-center shadow-[0_24px_60px_rgba(15,23,42,0.05)] sm:px-7">
                <h2 className="text-[22px] font-semibold text-slate-950">Coupons</h2>
                <p className="mt-3 text-sm text-slate-500">No coupon data is connected yet. We can design this view next when you are ready.</p>
              </section>
            ) : null}

            {activeView === "settings" ? (
              <section className="rounded-[8px] border border-white/80 bg-white px-6 py-16 text-center shadow-[0_24px_60px_rgba(15,23,42,0.05)] sm:px-7">
                <h2 className="text-[22px] font-semibold text-slate-950">Account Settings</h2>
                <p className="mt-3 text-sm text-slate-500">Settings form is not wired yet, but the dashboard layout is ready for it.</p>
              </section>
            ) : null}
          </div>
        </div>
      </section>
  );
}
