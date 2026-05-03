"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { fetchAdminCndsProfiles } from "@/lib/cnds/actions";
import { getAdminAccessState } from "@/lib/admin-access";
import { getSupabaseClient } from "@/lib/supabase-client";
import { getVendors } from "@/lib/vendors/queries";
import type { CndsShippingPricingType, CndsShippingProfileRow, VendorRow } from "@/types/product-db";

function formatPricingType(value: CndsShippingPricingType) {
  return value === "unit" ? "Per Unit" : "Fixed";
}

export default function CndsContent() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [profiles, setProfiles] = useState<CndsShippingProfileRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
        const [profileResult, vendorResult] = await Promise.all([fetchAdminCndsProfiles(), getVendors()]);

        if (!isMounted) {
          return;
        }

        setProfiles(profileResult.profiles.filter((profile) => Boolean(profile.vendor_id)));
        setVendors(vendorResult.data);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load vendor CNDS profiles.");
          setProfiles([]);
          setVendors([]);
        }
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

  const vendorNameById = useMemo(
    () => Object.fromEntries(vendors.map((vendor) => [vendor.id, vendor.name])),
    [vendors],
  );

  const filteredProfiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return profiles.filter((profile) => {
      if (!query) {
        return true;
      }

      const vendorName = profile.vendor_id ? vendorNameById[profile.vendor_id] ?? "" : "";

      return (
        profile.name.toLowerCase().includes(query) ||
        (profile.description ?? "").toLowerCase().includes(query) ||
        vendorName.toLowerCase().includes(query)
      );
    });
  }, [profiles, searchQuery, vendorNameById]);

  const activeCount = useMemo(() => profiles.filter((profile) => profile.is_active).length, [profiles]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading CNDS profiles...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Admin CNDS</h1>
        <p className="mt-3 text-sm text-slate-500">Please login as admin.</p>
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
        <h1 className="text-2xl font-semibold text-slate-900">Admin CNDS</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have admin access.</p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-6 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Admin Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Vendor CNDS Profiles</h1>
        <p className="max-w-2xl text-sm text-slate-500">
          CNDS profiles are now vendor-owned. Vendors manage their own profiles, and admins can review them here.
        </p>
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">
          {errorMessage}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Total Profiles</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{profiles.length}</p>
        </div>
        <div className="rounded-2xl border border-[#615FFF]/10 bg-[#615FFF]/5 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-[#615FFF]">Active</p>
          <p className="mt-2 text-2xl font-semibold text-[#615FFF]">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Vendors</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {new Set(profiles.map((profile) => profile.vendor_id).filter(Boolean)).size}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">Directory</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Vendor-owned CNDS list</h2>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by profile or vendor"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF] sm:max-w-sm"
          />
        </div>

        {filteredProfiles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
            No vendor-owned CNDS profiles found.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProfiles.map((profile) => (
              <article key={profile.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{profile.name}</p>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          profile.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {profile.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Vendor: {profile.vendor_id ? vendorNameById[profile.vendor_id] ?? profile.vendor_id : "Unknown"}
                    </p>
                    <p className="text-xs text-slate-500">{formatPricingType(profile.pricing_type)}</p>
                    {profile.description ? (
                      <p className="text-sm text-slate-500">{profile.description}</p>
                    ) : null}
                  </div>

                  <div className="text-sm text-slate-500">{profile.tiers.length} tier(s)</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
