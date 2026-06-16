"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getEmailAvatarUrl } from "@/lib/account/email-avatar";
import { getStatusColor, safeOrderStatus } from "@/lib/orders/utils";

type AccountUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatarUrl: string | null;
  phone?: string | null;
  address?: string | null;
};

type AccountOrderSummary = {
  payNow?: number;
};

type AccountOrder = {
  id: string;
  order_number: string;
  status: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  user_email?: string | null;
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
type SettingsTab = "personal-details" | "password";

const ORDER_FILTERS: Array<{ key: OrderFilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Placed" },
  { key: "confirmed", label: "Verified" },
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

function getStatusBadgeClass(status: string | null) {
  return getStatusColor(safeOrderStatus(status));
}

function formatOrderStatus(status: string | null) {
  return safeOrderStatus(status);
}

function getDisplayName(user: AccountUser) {
  if (user.name?.trim()) {
    return user.name.trim();
  }

  if (typeof user.email === "string" && user.email.includes("@")) {
    return user.email.split("@")[0].toUpperCase();
  }

  return "PRELIZE USER";
}

function getUserInitial(user: AccountUser) {
  return getDisplayName(user).trim().charAt(0).toUpperCase() || "U";
}

function getAvatarUrl(user: AccountUser) {
  if (user.avatarUrl?.trim()) {
    return user.avatarUrl;
  }

  return getEmailAvatarUrl(user.email, 160);
}

function AccountAvatar({
  src,
  alt,
  initial,
  size,
  className,
}: {
  src: string;
  alt: string;
  initial: string;
  size: string;
  className: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  return (
    <div className={className}>
      {src && !imageFailed ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={size}
          className="object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}

function matchesOrderFilter(order: AccountOrder, filter: OrderFilterKey) {
  const status = safeOrderStatus(order.status);
  const paymentStatus = (order.payment_status ?? "").trim().toLowerCase();

  switch (filter) {
    case "pending":
      return status === "Order Placed";
    case "confirmed":
      return status === "Payment Verified";
    case "delivered":
      return status === "Delivered";
    case "cancel":
      return status === "Cancelled";
    case "paid":
      return paymentStatus === "received" || paymentStatus === "paid";
    case "unpaid":
      return paymentStatus === "pending" || paymentStatus === "unpaid" || paymentStatus === "";
    default:
      return true;
  }
}

export default function AccountPageClient({ initialView = "dashboard" }: { initialView?: AccountView }) {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<AccountUser | null>(null);
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterKey, setFilterKey] = useState<OrderFilterKey>("all");
  const [activeView, setActiveView] = useState<AccountView>(initialView);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("personal-details");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [settingsErrorMessage, setSettingsErrorMessage] = useState("");
  const [settingsSuccessMessage, setSettingsSuccessMessage] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const syncSettingsFields = (currentUser: AccountUser) => {
    setProfileName(getDisplayName(currentUser));
    setProfilePhone(currentUser.phone ?? "");
    setProfileEmail(currentUser.email ?? "");
    setProfileAddress(currentUser.address ?? "");
  };

  useEffect(() => {
    let isMounted = true;

    const loadAccount = async () => {
      const response = await fetch("/api/account", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as {
        user?: AccountUser | null;
        orders?: AccountOrder[];
        error?: string;
      } | null;

      if (!isMounted) {
        return;
      }

      if (!response.ok) {
        setUser(null);
        setOrders([]);
        setErrorMessage(data?.error ?? "Unable to load your account.");
        setLoading(false);
        return;
      }

      const currentUser = data?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      syncSettingsFields(currentUser);
      setOrders(data?.orders ?? []);
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
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleProfileUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    setSettingsErrorMessage("");
    setSettingsSuccessMessage("");
    setIsSavingProfile(true);

    try {
      const normalizedName = profileName.trim();
      const normalizedEmail = profileEmail.trim();
      const emailChanged = normalizedEmail !== (user.email ?? "");
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: normalizedName,
          email: normalizedEmail,
          phone: profilePhone.trim(),
          address: profileAddress.trim(),
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        user?: AccountUser;
        error?: string;
      } | null;

      if (!response.ok || !data?.user) {
        setSettingsErrorMessage(data?.error ?? "Unable to save your profile.");
        return;
      }

      setUser(data.user);
      syncSettingsFields(data.user);

      setSettingsSuccessMessage(
        emailChanged
          ? "Profile saved successfully. Please use the new email for your next login."
          : "Profile saved successfully.",
      );
    } catch (error) {
      setSettingsErrorMessage(error instanceof Error ? error.message : "Unable to save your profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSettingsErrorMessage("");
    setSettingsSuccessMessage("");

    if (!user) {
      setSettingsErrorMessage("Please login again before updating your password.");
      return;
    }

    if (!currentPassword.trim()) {
      setSettingsErrorMessage("Current password is required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSettingsErrorMessage("New password and confirm password must match.");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const response = await fetch("/api/account/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setSettingsErrorMessage(data?.error ?? "Unable to update your password.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSettingsSuccessMessage("Password updated successfully.");
    } catch (error) {
      setSettingsErrorMessage(error instanceof Error ? error.message : "Unable to update your password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!user || !file) {
      return;
    }

    setSettingsErrorMessage("");
    setSettingsSuccessMessage("");

    if (!file.type.startsWith("image/")) {
      setSettingsErrorMessage("Please choose an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSettingsErrorMessage("Profile photo must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setIsUploadingAvatar(true);

    try {
      setSettingsErrorMessage("Profile photo upload is being migrated to the VPS storage system.");
    } catch {
      setSettingsErrorMessage("Unable to upload your profile photo.");
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
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
  const recentOrders = orders.slice(0, 5);
  const passwordHeading = "Change password";
  const passwordHelpText = "Enter your current password, then choose a new password for your account.";

  const sidebarItemClass = (isActive: boolean) =>
    `flex w-full items-center gap-3 rounded-[8px] px-4 py-3 text-left text-[15px] transition ${
      isActive
        ? "bg-[#615FFF] font-semibold text-white"
        : "text-slate-700 hover:bg-slate-50"
    }`;

  const renderOrdersTable = (orderList: AccountOrder[]) => (
    <div className="mt-6 overflow-hidden rounded-[8px] border border-slate-100">
      <div className="hidden grid-cols-[1.25fr_1.45fr_0.55fr_0.65fr] border-b border-slate-100 px-5 py-4 text-xs font-medium text-slate-500 md:grid">
        <span>Order</span>
        <span>Payment</span>
        <span>Amount</span>
        <span>Status</span>
      </div>

      <div className="divide-y divide-slate-100">
        {orderList.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="grid gap-4 px-5 py-5 transition hover:bg-slate-50 md:grid-cols-[1.25fr_1.45fr_0.55fr_0.65fr] md:items-center"
            >
              <div>
                <p className="text-sm font-semibold text-slate-950">{order.order_number || order.id.slice(0, 8)}</p>
                <p className="mt-1 text-sm text-slate-500">{formatOrderDate(order.created_at)}</p>
              </div>

              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ECEBFF] text-sm font-semibold text-[#615FFF]">
                  ৳
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 md:hidden">Payment</p>
                  <p className="truncate text-sm font-semibold text-slate-700">{order.payment_status ?? "Pending"}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{order.payment_method ?? "Bank Transfer"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 md:hidden">Amount</p>
                <p className="text-sm font-medium text-slate-700">{formatBDT(order.summary?.payNow ?? 0)}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400 md:hidden">Status</p>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(order.status)}`}>
                  {formatOrderStatus(order.status)}
                </span>
              </div>
            </Link>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-[8px] border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
            Loading your account...
          </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl rounded-[8px] border border-slate-200 bg-white px-8 py-12 text-center">
            <h1 className="text-3xl font-semibold text-slate-950">My Account</h1>
            <p className="mt-3 text-sm text-slate-500">Please login to access your account dashboard.</p>

            <Link
              href="/login"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[#615FFF] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#5552f0]"
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
          <aside className="flex box-border p-5 lg:sticky lg:top-6 lg:h-[calc(100dvh-13rem)]">
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
            <section className="rounded-[8px] border border-slate-200 bg-white px-6 py-6 sm:px-7">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <AccountAvatar
                    src={avatarUrl}
                    alt={displayName}
                    initial={getUserInitial(user)}
                    size="64px"
                    className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#ECEBFF] text-lg font-semibold text-[#615FFF]"
                  />

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
              <section className="rounded-[8px] border border-slate-200 bg-white px-6 py-6 sm:px-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-[22px] font-semibold text-slate-950">Recent Orders</h2>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveView("orders")}
                      className="inline-flex h-11 items-center justify-center rounded-[8px] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Filter
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveView("orders")}
                      className="inline-flex h-11 items-center justify-center rounded-[8px] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      See all
                    </button>
                  </div>
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
                  renderOrdersTable(recentOrders)
                )}
              </section>
            ) : null}

            {activeView === "orders" ? (
              <section className="rounded-[8px] border border-slate-200 bg-white px-6 py-6 sm:px-7">
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
                  renderOrdersTable(filteredOrders)
                )}
              </section>
            ) : null}

            {activeView === "messages" ? (
              <section className="rounded-[8px] border border-slate-200 bg-white px-6 py-16 text-center sm:px-7">
                <h2 className="text-[22px] font-semibold text-slate-950">Messages</h2>
                <p className="mt-3 text-sm text-slate-500">Messaging UI is not connected yet. This section is ready for your next design step.</p>
              </section>
            ) : null}

            {activeView === "coupons" ? (
              <section className="rounded-[8px] border border-slate-200 bg-white px-6 py-16 text-center sm:px-7">
                <h2 className="text-[22px] font-semibold text-slate-950">Coupons</h2>
                <p className="mt-3 text-sm text-slate-500">No coupon data is connected yet. We can design this view next when you are ready.</p>
              </section>
            ) : null}

            {activeView === "settings" ? (
              <section className="rounded-[8px] border border-slate-200 bg-white px-6 py-6 sm:px-7">
                <div>
                  <h2 className="text-[22px] font-semibold text-slate-950">Account Settings</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Keep your contact details, profile photo, and account access up to date.
                  </p>
                </div>

                <nav className="mt-7 flex gap-7 border-b border-slate-200">
                  {[
                    { key: "personal-details" as const, label: "Personal Details" },
                    { key: "password" as const, label: "Password" },
                  ].map((tab) => {
                    const isActive = settingsTab === tab.key;

                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setSettingsTab(tab.key);
                          setSettingsErrorMessage("");
                          setSettingsSuccessMessage("");
                        }}
                        className={`border-b-2 px-0 py-3 text-sm font-semibold transition-colors ${
                          isActive
                            ? "border-[#615FFF] text-[#615FFF]"
                            : "border-transparent text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>

                {settingsErrorMessage ? (
                  <div className="mt-6 rounded-[8px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {settingsErrorMessage}
                  </div>
                ) : null}

                {settingsSuccessMessage ? (
                  <div className="mt-6 rounded-[8px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {settingsSuccessMessage}
                  </div>
                ) : null}

                {settingsTab === "personal-details" ? (
                  <div className="mt-8 grid gap-8 xl:grid-cols-[220px_minmax(0,1fr)]">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Profile photo</p>
                      <div className="mt-4 flex flex-col items-start gap-4">
                        <AccountAvatar
                          src={avatarUrl}
                          alt={displayName}
                          initial={getUserInitial(user)}
                          size="112px"
                          className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-[#ECEBFF] text-3xl font-semibold text-[#615FFF]"
                        />
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={isUploadingAvatar}
                          className="inline-flex items-center justify-center rounded-[8px] bg-[#615FFF] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5552f0] disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {isUploadingAvatar ? "Uploading..." : "Upload from device"}
                        </button>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />
                        <p className="text-xs leading-5 text-slate-500">
                          Choose one JPG, PNG, WEBP, or GIF image from your device. Maximum size: 5 MB.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleProfileUpdate} className="space-y-5">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-950">Personal details</h3>
                        <p className="mt-1 text-sm text-slate-500">Update the information attached to your customer account.</p>
                      </div>

                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <label htmlFor="account-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                            Name
                          </label>
                          <input
                            id="account-name"
                            type="text"
                            value={profileName}
                            onChange={(event) => setProfileName(event.target.value)}
                            className="h-11 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="account-phone" className="mb-1.5 block text-sm font-medium text-slate-700">
                            Phone number
                          </label>
                          <input
                            id="account-phone"
                            type="tel"
                            value={profilePhone}
                            onChange={(event) => setProfilePhone(event.target.value)}
                            className="h-11 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                            placeholder="+880..."
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label htmlFor="account-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                            Email
                          </label>
                          <input
                            id="account-email"
                            type="email"
                            value={profileEmail}
                            onChange={(event) => setProfileEmail(event.target.value)}
                            className="h-11 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                            required
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label htmlFor="account-address" className="mb-1.5 block text-sm font-medium text-slate-700">
                            Address
                          </label>
                          <textarea
                            id="account-address"
                            value={profileAddress}
                            onChange={(event) => setProfileAddress(event.target.value)}
                            className="min-h-28 w-full resize-y rounded-[8px] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                            placeholder="Street address, area, and landmarks"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSavingProfile}
                        className="inline-flex items-center justify-center rounded-[8px] bg-[#615FFF] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5552f0] disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {isSavingProfile ? "Saving..." : "Save profile"}
                      </button>
                    </form>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordUpdate} className="mt-8 max-w-3xl space-y-5">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{passwordHeading}</h3>
                      <p className="mt-1 text-sm text-slate-500">{passwordHelpText}</p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label htmlFor="account-current-password" className="mb-1.5 block text-sm font-medium text-slate-700">
                          Current password
                        </label>
                        <input
                          id="account-current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(event) => setCurrentPassword(event.target.value)}
                          className="h-11 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                          autoComplete="current-password"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="account-new-password" className="mb-1.5 block text-sm font-medium text-slate-700">
                          New password
                        </label>
                        <input
                          id="account-new-password"
                          type="password"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          className="h-11 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                          minLength={6}
                          autoComplete="new-password"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="account-confirm-password" className="mb-1.5 block text-sm font-medium text-slate-700">
                          Confirm new password
                        </label>
                        <input
                          id="account-confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          className="h-11 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                          minLength={6}
                          autoComplete="new-password"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isUpdatingPassword}
                      className="inline-flex items-center justify-center rounded-[8px] border border-slate-900 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
                    >
                      {isUpdatingPassword ? "Updating..." : "Update password"}
                    </button>
                  </form>
                )}
              </section>
            ) : null}
          </div>
        </div>
      </section>
  );
}
