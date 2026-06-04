"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  createVendorCndsProfileRequest,
  fetchVendorCndsProfiles,
  updateVendorCndsProfileRequest,
  type CndsProfileEditorPayload,
} from "@/lib/cnds/actions";
import { getCurrentVendorMembership, getVendorWorkspaceAccessState } from "@/lib/marketplace-access";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { CndsShippingPricingType, CndsShippingProfileRow } from "@/types/product-db";

type TierFormValue = {
  id: string;
  min_qty: string;
  max_qty: string;
  price: string;
  sort_order: string;
};

type ProfileFormValues = {
  name: string;
  description: string;
  pricing_type: CndsShippingPricingType;
  is_active: boolean;
  tiers: TierFormValue[];
};

function createTierId() {
  return `tier-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyTier(sortOrder = 0): TierFormValue {
  return {
    id: createTierId(),
    min_qty: "1",
    max_qty: "",
    price: "0",
    sort_order: String(sortOrder),
  };
}

function getInitialFormValues(profile?: CndsShippingProfileRow | null): ProfileFormValues {
  if (!profile) {
    return {
      name: "",
      description: "",
      pricing_type: "fixed",
      is_active: true,
      tiers: [createEmptyTier(0)],
    };
  }

  return {
    name: profile.name,
    description: profile.description ?? "",
    pricing_type: profile.pricing_type,
    is_active: profile.is_active,
    tiers:
      profile.tiers.length > 0
        ? profile.tiers.map((tier, index) => ({
            id: createTierId(),
            min_qty: String(tier.min_qty),
            max_qty: tier.max_qty === null ? "" : String(tier.max_qty),
            price: String(tier.price),
            sort_order: String(tier.sort_order ?? index),
          }))
        : [createEmptyTier(0)],
  };
}

function buildPayload(values: ProfileFormValues): CndsProfileEditorPayload {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    pricing_type: values.pricing_type,
    is_active: values.is_active,
    tiers: values.tiers.map((tier, index) => ({
      min_qty: Math.max(1, Number.parseInt(tier.min_qty, 10) || 1),
      max_qty: tier.max_qty.trim() ? Math.max(1, Number.parseInt(tier.max_qty, 10) || 1) : null,
      price: Math.max(0, Number.parseFloat(tier.price) || 0),
      sort_order: Number.parseInt(tier.sort_order, 10) || index,
    })),
  };
}

function formatPricingType(value: CndsShippingPricingType) {
  return value === "unit" ? "Per Unit" : "Fixed";
}

function formatCreatedAt(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown";
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

export default function VendorCndsContent() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasVendorWorkspaceAccess, setHasVendorWorkspaceAccess] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<CndsShippingProfileRow[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [values, setValues] = useState<ProfileFormValues>(() => getInitialFormValues());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadPage = async () => {
      const access = await getVendorWorkspaceAccessState(supabase);
      const membership = await getCurrentVendorMembership(supabase);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasVendorWorkspaceAccess(Boolean(membership));
      setVendorId(membership?.vendor_id ?? null);

      if (!access.userEmail || !membership?.vendor_id) {
        setLoading(false);
        return;
      }

      try {
        const result = await fetchVendorCndsProfiles(membership.vendor_id, { includeInactive: true });

        if (!isMounted) {
          return;
        }

        setProfiles(result.profiles);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load CNDS profiles.");
          setProfiles([]);
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

  const filteredProfiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return profiles.filter((profile) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? profile.is_active : !profile.is_active);

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        profile.name.toLowerCase().includes(query) ||
        (profile.description ?? "").toLowerCase().includes(query) ||
        profile.pricing_type.toLowerCase().includes(query)
      );
    });
  }, [profiles, searchQuery, statusFilter]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  );

  const startCreateMode = () => {
    setSelectedProfileId(null);
    setValues(getInitialFormValues());
    setErrorMessage("");
    setSuccessMessage("");
    setIsEditorOpen(true);
  };

  const startEditMode = (profile: CndsShippingProfileRow) => {
    setSelectedProfileId(profile.id);
    setValues(getInitialFormValues(profile));
    setErrorMessage("");
    setSuccessMessage("");
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setSelectedProfileId(null);
    setValues(getInitialFormValues());
  };

  const refreshProfiles = async (focusProfileId?: string | null) => {
    if (!vendorId) {
      return;
    }

    const result = await fetchVendorCndsProfiles(vendorId, { includeInactive: true });
    setProfiles(result.profiles);

    if (focusProfileId) {
      const nextProfile = result.profiles.find((profile) => profile.id === focusProfileId) ?? null;
      setSelectedProfileId(nextProfile?.id ?? null);
      setValues(getInitialFormValues(nextProfile));
    } else {
      setSelectedProfileId(null);
      setValues(getInitialFormValues());
    }
  };

  const updateField = <K extends keyof ProfileFormValues>(field: K, value: ProfileFormValues[K]) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateTier = (id: string, field: keyof TierFormValue, value: string) => {
    setValues((current) => ({
      ...current,
      tiers: current.tiers.map((tier) => (tier.id === id ? { ...tier, [field]: value } : tier)),
    }));
  };

  const addTier = () => {
    setValues((current) => ({
      ...current,
      tiers: [...current.tiers, createEmptyTier(current.tiers.length)],
    }));
  };

  const removeTier = (id: string) => {
    setValues((current) => ({
      ...current,
      tiers: current.tiers.length > 1 ? current.tiers.filter((tier) => tier.id !== id) : current.tiers,
    }));
  };

  const handleSubmit = async () => {
    if (!vendorId) {
      setErrorMessage("No vendor account found.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = buildPayload(values);

      if (selectedProfileId) {
        await updateVendorCndsProfileRequest(vendorId, selectedProfileId, payload);
        await refreshProfiles();
        setSuccessMessage("CNDS profile updated.");
      } else {
        await createVendorCndsProfileRequest(vendorId, payload);
        await refreshProfiles();
        setSuccessMessage("CNDS profile created.");
      }

      closeEditor();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save the CNDS profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <h1 className="text-2xl font-semibold text-slate-900">Vendor CNDS</h1>
        <p className="mt-3 text-sm text-slate-500">Please login to access vendor CNDS profiles.</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (!hasVendorWorkspaceAccess || !vendorId) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Vendor CNDS</h1>
        <p className="mt-3 text-sm text-slate-500">No vendor account found.</p>
      </div>
    );
  }

  const accentBorder = "focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10";

  return (
    <section className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800">CNDS Profiles List</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create and manage the domestic delivery profiles assigned to your vendor products.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg bg-[#615FFF]/8 px-3 py-2 text-sm font-medium text-[#615FFF]">
              {filteredProfiles.length} visible
            </div>
            <button
              type="button"
              onClick={startCreateMode}
              className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Add CNDS Profile
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-[420px]">
            <label htmlFor="vendor-cnds-search" className="sr-only">
              Search CNDS profiles
            </label>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <SearchIcon />
            </span>
            <input
              id="vendor-cnds-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by profile name, description, or pricing type"
              className={`h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 outline-none transition-colors ${accentBorder}`}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:w-40">
              <label htmlFor="vendor-cnds-status-filter" className="sr-only">
                Filter by status
              </label>
              <select
                id="vendor-cnds-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
                className={`h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 outline-none transition-colors ${accentBorder}`}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
            >
              Clear
            </button>
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

        {profiles.length === 0 ? (
          <div className="p-6">
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
              No CNDS profiles yet. Create your first vendor-owned profile to use it on products.
            </div>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="p-6">
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
              No matching profiles found.
            </div>
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[980px]">
              <table className="min-w-full">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 sm:px-6">Profile</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Pricing Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Tiers</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Created At</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProfiles.map((profile) => {
                    const isSelected = selectedProfileId === profile.id;

                    return (
                      <tr key={profile.id} className={isSelected ? "bg-[#615FFF]/5" : ""}>
                        <td className="px-5 py-5 text-left sm:px-6">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-800">{profile.name}</p>
                            <span className="mt-1 block truncate text-xs text-gray-500">
                              Vendor-owned domestic delivery
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-sm text-gray-500">
                          <span className="block max-w-[300px] truncate">
                            {profile.description || "No description added"}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-sm text-gray-500">{formatPricingType(profile.pricing_type)}</td>
                        <td className="px-4 py-5 text-sm font-semibold text-[#615FFF]">{profile.tiers.length}</td>
                        <td className="px-4 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              profile.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {profile.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-sm text-gray-500">{formatCreatedAt(profile.created_at)}</td>
                        <td className="px-4 py-5 text-right">
                          <button
                            type="button"
                            onClick={() => startEditMode(profile)}
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                          >
                            Edit
                          </button>
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

      {isEditorOpen ? (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-[2px]">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-base font-medium text-gray-800">
                  {selectedProfile ? `Edit ${selectedProfile.name}` : "Create CNDS Profile"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure the quantity ranges and domestic delivery costs for this profile.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-slate-500 transition-colors hover:border-[#615FFF]/30 hover:text-slate-900"
                aria-label="Close editor"
              >
                x
              </button>
            </div>

            <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="vendor-cnds-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Profile Name
                  </label>
                  <input
                    id="vendor-cnds-name"
                    type="text"
                    value={values.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    className={`h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors ${accentBorder}`}
                    placeholder="Vendor CNDS"
                  />
                </div>

                <div>
                  <label htmlFor="vendor-cnds-pricing-type" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Pricing Type
                  </label>
                  <select
                    id="vendor-cnds-pricing-type"
                    value={values.pricing_type}
                    onChange={(event) => updateField("pricing_type", event.target.value as CndsShippingPricingType)}
                    className={`h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors ${accentBorder}`}
                  >
                    <option value="fixed">Fixed</option>
                    <option value="unit">Per Unit</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="vendor-cnds-description" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  id="vendor-cnds-description"
                  value={values.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  rows={4}
                  className={`w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-800 outline-none transition-colors ${accentBorder}`}
                  placeholder="Optional internal notes for this CNDS profile."
                />
              </div>

              <label className="mt-4 inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={values.is_active}
                  onChange={(event) => updateField("is_active", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#615FFF] focus:ring-[#615FFF]"
                />
                Active Profile
              </label>

              <div className="mt-6 rounded-2xl border border-gray-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Shipping Tiers</p>
                    <p className="text-xs text-slate-500">Define the quantity breakpoints and cost values.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addTier}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                  >
                    Add Tier
                  </button>
                </div>

                <div className="space-y-4">
                  {values.tiers.map((tier, index) => (
                    <div key={tier.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">Tier {index + 1}</p>
                        <button
                          type="button"
                          onClick={() => removeTier(tier.id)}
                          disabled={values.tiers.length === 1}
                          className="text-sm font-medium text-rose-500 disabled:cursor-not-allowed disabled:text-slate-300"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-4">
                        <input
                          type="number"
                          min="1"
                          value={tier.min_qty}
                          onChange={(event) => updateTier(tier.id, "min_qty", event.target.value)}
                          className={`h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors ${accentBorder}`}
                          placeholder="Min Qty"
                        />
                        <input
                          type="number"
                          min="1"
                          value={tier.max_qty}
                          onChange={(event) => updateTier(tier.id, "max_qty", event.target.value)}
                          className={`h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors ${accentBorder}`}
                          placeholder="Max Qty"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tier.price}
                          onChange={(event) => updateTier(tier.id, "price", event.target.value)}
                          className={`h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors ${accentBorder}`}
                          placeholder="Price"
                        />
                        <input
                          type="number"
                          min="0"
                          value={tier.sort_order}
                          onChange={(event) => updateTier(tier.id, "sort_order", event.target.value)}
                          className={`h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors ${accentBorder}`}
                          placeholder="Sort Order"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : selectedProfile ? "Update Profile" : "Create Profile"}
                </button>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
