"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  createAdminPricingTierProfileRequest,
  createVendorPricingTierProfileRequest,
  fetchAdminPricingTierProfiles,
  fetchVendorPricingTierProfiles,
  updateAdminPricingTierProfileRequest,
  updateVendorPricingTierProfileRequest,
  type PricingTierProfileEditorPayload,
} from "@/lib/pricing-tiers/actions";
import { getAdminAccessState } from "@/lib/admin-access";
import { getCurrentVendorMembership, getVendorWorkspaceAccessState } from "@/lib/marketplace-access";
import { getPgDataClient } from "@/lib/browser-app-client";
import { getVendors } from "@/lib/vendors/queries";
import type { PricingTierProfileRow, ProductPricingType, VendorRow } from "@/types/product-db";

type TierFormValue = {
  id: string;
  min_qty: string;
  max_qty: string;
  price: string;
  sort_order: string;
};

type ProfileFormValues = {
  name: string;
  pricing_type: ProductPricingType;
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

function getInitialFormValues(profile?: PricingTierProfileRow | null): ProfileFormValues {
  if (!profile) {
    return {
      name: "",
      pricing_type: "unit",
      is_active: true,
      tiers: [createEmptyTier(0)],
    };
  }

  return {
    name: profile.name,
    pricing_type: profile.pricing_type,
    is_active: profile.is_active,
    tiers:
      profile.rows.length > 0
        ? profile.rows.map((tier, index) => ({
            id: createTierId(),
            min_qty: String(tier.min_qty),
            max_qty: tier.max_qty === null ? "" : String(tier.max_qty),
            price: String(tier.price),
            sort_order: String(tier.sort_order ?? index),
          }))
        : [createEmptyTier(0)],
  };
}

function buildPayload(values: ProfileFormValues): PricingTierProfileEditorPayload {
  return {
    name: values.name.trim(),
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

function formatPricingType(value: ProductPricingType) {
  return value === "unit" ? "Unit Pricing" : "Fixed Range Pricing";
}

export default function PricingTierProfileManager({ mode }: { mode: "admin" | "vendor" }) {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<PricingTierProfileRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [values, setValues] = useState<ProfileFormValues>(() => getInitialFormValues());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const dataClient = getPgDataClient();

    const loadPage = async () => {
      try {
        if (mode === "admin") {
          const [access, profileResult, vendorResult] = await Promise.all([
            getAdminAccessState(dataClient),
            fetchAdminPricingTierProfiles(),
            getVendors(),
          ]);

          if (!isMounted) {
            return;
          }

          setUserEmail(access.userEmail);
          setHasAccess(access.hasAdminAccess);

          if (!access.userEmail || !access.hasAdminAccess) {
            return;
          }

          setProfiles(profileResult.profiles);
          setVendors(vendorResult.data);
          return;
        }

        const [access, membership] = await Promise.all([
          getVendorWorkspaceAccessState(dataClient),
          getCurrentVendorMembership(dataClient),
        ]);

        if (!isMounted) {
          return;
        }

        setUserEmail(access.userEmail);
        setHasAccess(Boolean(membership));
        setVendorId(membership?.vendor_id ?? null);

        if (!access.userEmail || !membership?.vendor_id) {
          return;
        }

        const result = await fetchVendorPricingTierProfiles(membership.vendor_id, { includeInactive: true });

        if (!isMounted) {
          return;
        }

        setProfiles(result.profiles);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load pricing tier profiles.",
          );
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
  }, [mode]);

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
        profile.pricing_type.toLowerCase().includes(query) ||
        vendorName.toLowerCase().includes(query)
      );
    });
  }, [profiles, searchQuery, vendorNameById]);

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

  const startEditMode = (profile: PricingTierProfileRow) => {
    setSelectedProfileId(profile.id);
    setValues(getInitialFormValues(profile));
    setErrorMessage("");
    setSuccessMessage("");
  };

  const refreshProfiles = async (focusProfileId?: string | null) => {
    const result =
      mode === "admin"
        ? await fetchAdminPricingTierProfiles()
        : vendorId
          ? await fetchVendorPricingTierProfiles(vendorId, { includeInactive: true })
          : { profiles: [] as PricingTierProfileRow[] };

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
    if (mode === "vendor" && !vendorId) {
      setErrorMessage("No vendor account found.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = buildPayload(values);

      if (selectedProfileId) {
        if (mode === "admin") {
          await updateAdminPricingTierProfileRequest(selectedProfileId, payload);
        } else {
          await updateVendorPricingTierProfileRequest(vendorId ?? "", selectedProfileId, payload);
        }

        await refreshProfiles(selectedProfileId);
        setSuccessMessage("Pricing tier profile updated.");
      } else {
        const result =
          mode === "admin"
            ? await createAdminPricingTierProfileRequest(payload)
            : await createVendorPricingTierProfileRequest(vendorId ?? "", payload);

        await refreshProfiles(result.profile.id);
        setSuccessMessage("Pricing tier profile created.");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save the pricing tier profile.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading pricing tier profiles...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          {mode === "admin" ? "Admin Pricing Tiers" : "Vendor Pricing Tiers"}
        </h1>
        <p className="mt-3 text-sm text-slate-500">Please login first.</p>
        <Link
          href="/login"
          className={`mt-6 inline-flex items-center justify-center rounded-xl px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90 ${
            mode === "admin" ? "bg-[#615FFF] text-white" : "bg-emerald-500 text-slate-950"
          }`}
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          {mode === "admin" ? "Admin Pricing Tiers" : "Vendor Pricing Tiers"}
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          {mode === "admin" ? "You do not have admin access." : "No vendor account found."}
        </p>
      </div>
    );
  }

  const accentText = mode === "admin" ? "text-[#615FFF]" : "text-emerald-600";
  const accentBg = mode === "admin" ? "bg-[#615FFF]" : "bg-emerald-500";
  const accentSoft = mode === "admin" ? "border-[#615FFF]/10 bg-[#615FFF]/5" : "border-emerald-100 bg-emerald-50";
  const accentBorder = mode === "admin" ? "focus:border-[#615FFF]" : "focus:border-emerald-500";
  const accentHover = mode === "admin" ? "hover:border-[#615FFF]/40" : "hover:border-emerald-300";

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <p className={`text-sm font-semibold uppercase tracking-[0.18em] ${accentText}`}>
            {mode === "admin" ? "Admin Dashboard" : "Vendor Dashboard"}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Pricing Tier Profiles</h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Create reusable pricing profiles that products can select instead of defining inline tiers.
          </p>
        </div>

        <button
          type="button"
          onClick={startCreateMode}
          className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-90 ${
            mode === "admin" ? "bg-[#615FFF] text-white" : "bg-emerald-500 text-slate-950"
          }`}
        >
          Add Pricing Profile
        </button>
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className={`mb-6 rounded-2xl border px-5 py-4 text-sm font-medium ${mode === "admin" ? "border-[#615FFF]/20 bg-[#615FFF]/5 text-[#615FFF]" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {successMessage}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Total Profiles</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{profiles.length}</p>
        </div>
        <div className={`rounded-2xl border p-5 shadow-sm ${accentSoft}`}>
          <p className={`text-xs uppercase tracking-[0.16em] ${accentText}`}>Active</p>
          <p className={`mt-2 text-2xl font-semibold ${accentText}`}>{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
            {mode === "admin" ? "Global / Vendor Mix" : "Vendor Scope"}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {mode === "admin" ? "Admin can review global and vendor-owned profiles." : vendorId}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className={`text-sm font-semibold uppercase tracking-[0.16em] ${accentText}`}>Profiles</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {mode === "admin" ? "All profiles" : "Your profiles"}
              </h2>
            </div>
            <button
              type="button"
              onClick={startCreateMode}
              className={`inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors ${accentHover} hover:text-slate-900`}
            >
              New
            </button>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search pricing profiles"
            className={`mb-4 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors ${accentBorder}`}
          />

          {profiles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
              No pricing tier profiles yet.
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
                        ? mode === "admin"
                          ? "border-[#615FFF]/30 bg-[#615FFF]/5"
                          : "border-emerald-300 bg-emerald-50"
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
                      {mode === "admin" && profile.vendor_id === null ? (
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          Global
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{formatPricingType(profile.pricing_type)}</p>
                    {mode === "admin" ? (
                      <p className="mt-1 text-xs text-slate-400">
                        Owner: {profile.vendor_id ? vendorNameById[profile.vendor_id] ?? profile.vendor_id : "Global"}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-400">{profile.rows.length} tier(s)</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className={`text-sm font-semibold uppercase tracking-[0.16em] ${accentText}`}>Editor</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {selectedProfile ? `Edit ${selectedProfile.name}` : "Create pricing profile"}
              </h2>
            </div>
            {selectedProfile ? (
              <button
                type="button"
                onClick={startCreateMode}
                className={`inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors ${accentHover} hover:text-slate-900`}
              >
                New Profile
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Profile Name</label>
              <input
                type="text"
                value={values.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Wholesale bulk pricing"
                className={`h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors ${accentBorder}`}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Pricing Type</label>
              <select
                value={values.pricing_type}
                onChange={(event) => updateField("pricing_type", event.target.value as ProductPricingType)}
                className={`h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors ${accentBorder}`}
              >
                <option value="unit">Unit Pricing</option>
                <option value="fixed">Fixed Range Pricing</option>
              </select>
            </div>

            <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={values.is_active}
                onChange={(event) => updateField("is_active", event.target.checked)}
                className={`h-4 w-4 border-slate-300 ${mode === "admin" ? "text-[#615FFF] focus:ring-[#615FFF]" : "text-emerald-500 focus:ring-emerald-500"}`}
              />
              Active profile
            </label>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Pricing Tier Rows</p>
                <p className="text-xs text-slate-500">Add quantity ranges and the price for each range.</p>
              </div>
              <button
                type="button"
                onClick={addTier}
                className={`inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-90 ${
                  mode === "admin" ? "bg-[#615FFF] text-white" : "bg-emerald-500 text-slate-950"
                }`}
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
                        className={`h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors ${accentBorder}`}
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
                        className={`h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors ${accentBorder}`}
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
                        className={`h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors ${accentBorder}`}
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
                        className={`h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors ${accentBorder}`}
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
              className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${
                mode === "admin" ? "bg-[#615FFF] text-white" : "bg-emerald-500 text-slate-950"
              }`}
            >
              {isSubmitting ? "Saving..." : selectedProfile ? "Update Profile" : "Create Profile"}
            </button>
            <p className="text-sm text-slate-500">
              {mode === "admin"
                ? "Admins can create global profiles and update any existing pricing profile."
                : "Only your vendor account can use and manage these pricing tier profiles."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
