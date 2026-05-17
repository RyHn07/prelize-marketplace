"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AdminEmptyState from "@/components/admin/admin-empty-state";
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
  const status = user.vendorId ? "member" : user.invitationStatus ?? "pending";
  const label =
    status === "member"
      ? "Already vendor"
      : status === "accepted"
        ? "Accepted"
        : status === "rejected"
          ? "Rejected"
          : "Pending";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getInvitationBadgeClasses(status)}`}>
      {label}
    </span>
  );
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

function SortIcon() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true" className="text-slate-300">
      <path d="M5 1 8 4H2L5 1Z" fill="currentColor" />
      <path d="M5 11 2 8h6l-3 3Z" fill="currentColor" />
    </svg>
  );
}

function getUserInitials(user: AdminVendorInviteableUser) {
  const source = user.name?.trim() || user.email.trim();
  const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) {
    return "U";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
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
    <section className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800">Add Vendor</h3>
            <p className="mt-1 text-sm text-gray-500">
              Select an existing registered user and invite them into the vendor onboarding flow.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg bg-[#615FFF]/8 px-3 py-2 text-sm font-medium text-[#615FFF]">
              {filteredUsers.length} visible
            </div>
            <Link
              href="/admin/vendors"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
            >
              Back to Vendors
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-[380px]">
            <label htmlFor="vendor-user-search" className="sr-only">
              Search registered users
            </label>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <SearchIcon />
            </span>
            <input
              id="vendor-user-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name or email"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
            />
          </div>
        </div>

        {successMessage ? (
          <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 sm:px-6">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="border-b border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600 sm:px-6">
            {errorMessage}
          </div>
        ) : null}

        {userListError ? (
          <div className="border-b border-amber-100 bg-amber-50 px-5 py-4 text-sm text-amber-700 sm:px-6">
            {userListError}
            <span className="mt-2 block">
              This page requires `SUPABASE_SERVICE_ROLE_KEY` so admin can read registered auth users.
            </span>
          </div>
        ) : registeredUsers.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No registered users found"
              description="Create or sign in user accounts first, then invite them from here."
            />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No matching users found"
              description="Try a different search term."
            />
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[980px]">
              <table className="min-w-full">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 sm:px-6">
                      <div className="flex items-center gap-2">
                        <span>User</span>
                        <SortIcon />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      <div className="flex items-center gap-2">
                        <span>Email</span>
                        <SortIcon />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Invite Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => {
                    const shouldShowBadge = Boolean(user.vendorId) || user.invitationStatus !== null;

                    return (
                      <tr key={user.id}>
                        <td className="px-5 py-5 text-left sm:px-6">
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#615FFF]/12 text-sm font-semibold text-[#615FFF]">
                              {getUserInitials(user)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-800">{user.name ?? "Unnamed user"}</p>
                              <span className="mt-1 block truncate text-xs text-gray-500">User ID: {user.id.slice(0, 8)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-sm text-gray-500">{user.email}</td>
                        <td className="px-4 py-5">
                          {shouldShowBadge ? (
                            <InvitationBadge user={user} />
                          ) : (
                            <span className="text-sm text-slate-500">Not invited</span>
                          )}
                        </td>
                        <td className="px-4 py-5 text-right">
                          {shouldShowBadge ? null : (
                            <button
                              type="button"
                              disabled={invitingUserId === user.id}
                              onClick={() => void handleInvite(user.id)}
                              className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              {invitingUserId === user.id ? "Sending..." : "Send Invite"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
