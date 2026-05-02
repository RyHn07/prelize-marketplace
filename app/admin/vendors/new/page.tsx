"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getAdminAccessState } from "@/lib/admin-access";
import { getSupabaseClient } from "@/lib/supabase-client";
import {
  fetchAdminVendorUsers,
  inviteVendorUser,
  type AdminVendorInviteableUser,
} from "@/lib/vendor-onboarding";

function getInvitationBadgeClasses(status: "pending" | "accepted" | "rejected" | "member") {
  if (status === "accepted" || status === "member") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "rejected") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-amber-100 text-amber-700";
}

function InvitationBadge({ user }: { user: AdminVendorInviteableUser }) {
  const status = user.vendorId
    ? "member"
    : user.invitationStatus ?? "pending";
  const label =
    status === "member"
      ? "Already vendor"
      : status === "accepted"
        ? "Accepted"
        : status === "rejected"
          ? "Rejected"
          : "Pending";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getInvitationBadgeClasses(status)}`}
    >
      {label}
    </span>
  );
}

export default function AdminNewVendorPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<AdminVendorInviteableUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [userListError, setUserListError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadPage = async () => {
      const access = await getAdminAccessState(supabase);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasAdminAccess(access.hasAdminAccess);

      if (!access.userEmail || !access.hasAdminAccess) {
        setLoading(false);
        return;
      }

      try {
        const result = await fetchAdminVendorUsers();

        if (!isMounted) {
          return;
        }

        setRegisteredUsers(result.users);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setUserListError(
          error instanceof Error
            ? error.message
            : "Unable to load registered users. Confirm SUPABASE_SERVICE_ROLE_KEY is configured for admin invite pages.",
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return registeredUsers.filter((user) => {
      if (query.length === 0) {
        return true;
      }

      return user.email.toLowerCase().includes(query) || (user.name ?? "").toLowerCase().includes(query);
    });
  }, [registeredUsers, searchQuery]);

  const handleInvite = async (userId: string) => {
    setInvitingUserId(userId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await inviteVendorUser(userId);
      const refreshed = await fetchAdminVendorUsers();
      setRegisteredUsers(refreshed.users);
      setSuccessMessage("Vendor invitation sent successfully.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to send vendor invitation.");
    } finally {
      setInvitingUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading vendor invites...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Add Vendor</h1>
        <p className="mt-3 text-sm text-slate-500">Please login as admin</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Add Vendor</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have admin access</p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6">
        <Link
          href="/admin/vendors"
          className="inline-flex text-sm font-medium text-[#615FFF] transition-colors hover:text-[#5552e6]"
        >
          Back to Vendors
        </Link>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Admin Dashboard</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Add Vendor</h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Select an existing registered user and invite them for vendor registration.
          </p>
        </div>

        {errorMessage ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label htmlFor="vendor-user-search" className="sr-only">
            Search registered users
          </label>
          <input
            id="vendor-user-search"
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name or email"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
          />
        </div>

        {userListError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
            {userListError}
            <span className="block mt-2">
              This page requires `SUPABASE_SERVICE_ROLE_KEY` so admin can read registered auth users.
            </span>
          </div>
        ) : registeredUsers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
            <h2 className="text-lg font-semibold text-slate-900">No registered users found</h2>
            <p className="mt-2 text-sm text-slate-500">Create or sign in user accounts first, then invite them from here.</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
            <h2 className="text-lg font-semibold text-slate-900">No matching users found</h2>
            <p className="mt-2 text-sm text-slate-500">Try a different search term.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const shouldShowBadge = Boolean(user.vendorId) || user.invitationStatus !== null;

              return (
                <article
                  key={user.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{user.name ?? "Unnamed user"}</p>
                    <p className="mt-1 truncate text-sm text-slate-500">{user.email}</p>
                  </div>

                  {shouldShowBadge ? (
                    <InvitationBadge user={user} />
                  ) : (
                    <button
                      type="button"
                      disabled={invitingUserId === user.id}
                      onClick={() => void handleInvite(user.id)}
                      className="inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {invitingUserId === user.id ? "Sending..." : "Send Invite"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
