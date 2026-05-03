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

export default function VendorCndsContent() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasVendorWorkspaceAccess, setHasVendorWorkspaceAccess] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<CndsShippingProfileRow[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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
      if (!query) {
        return true;
      }

      return (
        profile.name.toLowerCase().includes(query) ||
        (profile.description ?? "").toLowerCase().includes(query) ||
        profile.pricing_type.toLowerCase().includes(query)
      );
    });
  }, [profiles, searchQuery]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  );

  const activeCount = useMemo(() => profiles.filter((profile) => profile.is_active).length, [profiles]);

  const startCreateMode = () => {
    setSelectedProfileId(null);
    setValues(getInitialFormValues());
    setErrorMessage("");
    setSuccessMessage("");
  };

  const startEditMode = (profile: CndsShippingProfileRow) => {
    setSelectedProfileId(profile.id);
    setValues(getInitialFormValues(profile));
    setErrorMessage("");
    setSuccessMessage("");
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
        await refreshProfiles(selectedProfileId);
        setSuccessMessage("CNDS profile updated.");
      } else {
        const result = await createVendorCndsProfileRequest(vendorId, payload);
        await refreshProfiles(result.profile.id);
        setSuccessMessage("CNDS profile created.");
      }
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
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
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

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">Vendor Dashboard</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">CNDS Shipping Profiles</h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Create and manage the CNDS shipping profiles assigned to your own vendor products.
          </p>
        </div>

        <button
          type="button"
          onClick={startCreateMode}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
        >
          Add CNDS Profile
        </button>
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

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Total Profiles</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{profiles.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-500">Active</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Vendor Scope</p>
          <p className="mt-2 break-all text-sm font-semibold text-slate-900">{vendorId}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-600">Profiles</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Your CNDS list</h2>
            </div>
            <button
              type="button"
              onClick={startCreateMode}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-emerald-300 hover:text-slate-900"
            >
              New
            </button>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search CNDS profiles"
            className="mb-4 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-emerald-500"
          />

          {profiles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
              No CNDS profiles yet. Create your first vendor-owned profile to use it on products.
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
              No matching profiles found.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProfiles.map((profile) => {
                const isSelected = selectedProfileId === profile.id;

                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => startEditMode(profile)}
                    className={`block w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                      isSelected
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
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
                    <p className="mt-1 text-xs text-slate-500">{formatPricingType(profile.pricing_type)}</p>
                    <p className="mt-2 text-xs text-slate-400">{profile.tiers.length} tier(s)</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-600">Editor</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {selectedProfile ? `Edit ${selectedProfile.name}` : "Create CNDS profile"}
              </h2>
            </div>
            {selectedProfile ? (
              <button
                type="button"
                onClick={startCreateMode}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-emerald-300 hover:text-slate-900"
              >
                New Profile
              </button>
            ) : null}
          </div>

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
                placeholder="Vendor CNDS"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-emerald-500"
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
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-emerald-500"
              >
                <option value="fixed">Fixed</option>
                <option value="unit">Per Unit</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="vendor-cnds-description" className="mb-1.5 block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                id="vendor-cnds-description"
                rows={3}
                value={values.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Optional internal notes for this CNDS profile."
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-emerald-500"
              />
            </div>

            <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={values.is_active}
                onChange={(event) => updateField("is_active", event.target.checked)}
                className="h-4 w-4 border-slate-300 text-emerald-500 focus:ring-emerald-500"
              />
              Active profile
            </label>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">CNDS Tiers</p>
                <p className="text-xs text-slate-500">Add simple quantity ranges and prices.</p>
              </div>
              <button
                type="button"
                onClick={addTier}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
              >
                Add Tier
              </button>
            </div>

            <div className="space-y-3">
              {values.tiers.map((tier, index) => (
                <div key={tier.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">Tier {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeTier(tier.id)}
                      disabled={values.tiers.length === 1}
                      className="text-sm font-medium text-rose-600 transition-colors hover:text-rose-700 disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Min Qty</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={tier.min_qty}
                        onChange={(event) => updateTier(tier.id, "min_qty", event.target.value)}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Max Qty</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={tier.max_qty}
                        onChange={(event) => updateTier(tier.id, "max_qty", event.target.value)}
                        placeholder="Optional"
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tier.price}
                        onChange={(event) => updateTier(tier.id, "price", event.target.value)}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Sort Order</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={tier.sort_order}
                        onChange={(event) => updateTier(tier.id, "sort_order", event.target.value)}
                        className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : selectedProfile ? "Update Profile" : "Create Profile"}
            </button>
            <p className="text-sm text-slate-500">Only your vendor account can use and manage these CNDS profiles.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
