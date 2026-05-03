"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  createAdminInternationalShippingMethodRequest,
  fetchAdminInternationalShippingMethods,
  updateAdminInternationalShippingMethodRequest,
} from "@/lib/international-shipping/actions";
import { getAdminAccessState } from "@/lib/admin-access";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { InternationalShippingMethodRow } from "@/types/product-db";

type TierFormValue = {
  id: string;
  min_weight_kg: string;
  max_weight_kg: string;
  price_per_kg: string;
  sort_order: string;
};

type MethodFormValue = {
  name: string;
  slug: string;
  description: string;
  delivery_min_days: string;
  delivery_max_days: string;
  minimum_weight_kg: string;
  sort_order: string;
  is_active: boolean;
  tiers: TierFormValue[];
};

function createEmptyTier(index = 0): TierFormValue {
  return {
    id: `tier-${Date.now()}-${index}`,
    min_weight_kg: index === 0 ? "0.1" : "",
    max_weight_kg: "",
    price_per_kg: "",
    sort_order: String(index),
  };
}

function createEmptyMethodForm(): MethodFormValue {
  return {
    name: "",
    slug: "",
    description: "",
    delivery_min_days: "",
    delivery_max_days: "",
    minimum_weight_kg: "0.1",
    sort_order: "0",
    is_active: true,
    tiers: [createEmptyTier()],
  };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDeliveryWindow(method: InternationalShippingMethodRow) {
  if (method.delivery_min_days !== null && method.delivery_max_days !== null) {
    return `${method.delivery_min_days}-${method.delivery_max_days} days`;
  }

  if (method.delivery_min_days !== null) {
    return `${method.delivery_min_days}+ days`;
  }

  if (method.delivery_max_days !== null) {
    return `Up to ${method.delivery_max_days} days`;
  }

  return "Not set";
}

function mapMethodToForm(method: InternationalShippingMethodRow): MethodFormValue {
  return {
    name: method.name,
    slug: method.slug,
    description: method.description ?? "",
    delivery_min_days: method.delivery_min_days?.toString() ?? "",
    delivery_max_days: method.delivery_max_days?.toString() ?? "",
    minimum_weight_kg: method.minimum_weight_kg.toString(),
    sort_order: method.sort_order.toString(),
    is_active: method.is_active,
    tiers: method.tiers.length > 0
      ? method.tiers.map((tier, index) => ({
          id: tier.id || `tier-${index}`,
          min_weight_kg: tier.min_weight_kg.toString(),
          max_weight_kg: tier.max_weight_kg?.toString() ?? "",
          price_per_kg: tier.price_per_kg.toString(),
          sort_order: tier.sort_order.toString(),
        }))
      : [createEmptyTier()],
  };
}

function buildPayload(formValues: MethodFormValue) {
  return {
    name: formValues.name,
    slug: formValues.slug,
    description: formValues.description,
    delivery_min_days: formValues.delivery_min_days,
    delivery_max_days: formValues.delivery_max_days,
    minimum_weight_kg: formValues.minimum_weight_kg,
    sort_order: formValues.sort_order,
    is_active: formValues.is_active,
    tiers: formValues.tiers.map((tier) => ({
      min_weight_kg: tier.min_weight_kg,
      max_weight_kg: tier.max_weight_kg,
      price_per_kg: tier.price_per_kg,
      sort_order: tier.sort_order,
    })),
  };
}

export default function InternationalShippingContent() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [methods, setMethods] = useState<InternationalShippingMethodRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<MethodFormValue>(createEmptyMethodForm());
  const [isSaving, setIsSaving] = useState(false);

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
        const result = await fetchAdminInternationalShippingMethods();

        if (!isMounted) {
          return;
        }

        setMethods(result.methods);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load international shipping methods.",
          );
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

  const filteredMethods = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return methods.filter((method) => {
      if (!query) {
        return true;
      }

      return (
        method.name.toLowerCase().includes(query) ||
        method.slug.toLowerCase().includes(query) ||
        (method.description ?? "").toLowerCase().includes(query)
      );
    });
  }, [methods, searchQuery]);

  const activeCount = useMemo(() => methods.filter((method) => method.is_active).length, [methods]);

  const resetForm = () => {
    setEditingMethodId(null);
    setFormValues(createEmptyMethodForm());
  };

  const upsertMethod = (method: InternationalShippingMethodRow) => {
    setMethods((current) => {
      const existingIndex = current.findIndex((entry) => entry.id === method.id);

      if (existingIndex === -1) {
        return [...current, method].sort((left, right) => left.sort_order - right.sort_order);
      }

      const nextMethods = [...current];
      nextMethods[existingIndex] = method;
      return nextMethods.sort((left, right) => left.sort_order - right.sort_order);
    });
  };

  const handleInputChange = (field: keyof Omit<MethodFormValue, "tiers" | "is_active">, value: string) => {
    setFormValues((current) => {
      const nextValues = {
        ...current,
        [field]: value,
      };

      if (field === "name" && !editingMethodId && !current.slug.trim()) {
        nextValues.slug = slugify(value);
      }

      return nextValues;
    });
  };

  const handleTierChange = (tierId: string, field: keyof TierFormValue, value: string) => {
    setFormValues((current) => ({
      ...current,
      tiers: current.tiers.map((tier) => (tier.id === tierId ? { ...tier, [field]: value } : tier)),
    }));
  };

  const handleAddTier = () => {
    setFormValues((current) => ({
      ...current,
      tiers: [...current.tiers, createEmptyTier(current.tiers.length)],
    }));
  };

  const handleRemoveTier = (tierId: string) => {
    setFormValues((current) => ({
      ...current,
      tiers: current.tiers.length === 1 ? current.tiers : current.tiers.filter((tier) => tier.id !== tierId),
    }));
  };

  const handleEdit = (method: InternationalShippingMethodRow) => {
    setEditingMethodId(method.id);
    setFormValues(mapMethodToForm(method));
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = buildPayload(formValues);
      const method = editingMethodId
        ? await updateAdminInternationalShippingMethodRequest(editingMethodId, payload)
        : await createAdminInternationalShippingMethodRequest(payload);

      upsertMethod(method);
      resetForm();
      setSuccessMessage(editingMethodId ? "Shipping method updated." : "Shipping method created.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save the shipping method.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (method: InternationalShippingMethodRow) => {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const updatedMethod = await updateAdminInternationalShippingMethodRequest(method.id, {
        ...mapMethodToForm(method),
        is_active: !method.is_active,
      });

      upsertMethod(updatedMethod);
      setSuccessMessage(updatedMethod.is_active ? "Shipping method activated." : "Shipping method deactivated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update method status.");
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading international shipping methods...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">International Shipping</h1>
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
        <h1 className="text-2xl font-semibold text-slate-900">International Shipping</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have admin access.</p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Admin Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">International Shipping</h1>
        <p className="max-w-2xl text-sm text-slate-500">
          Manage China to Bangladesh shipping methods separately from CNDS. Vendors only enter product weight.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Total Methods</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{methods.length}</p>
        </div>
        <div className="rounded-2xl border border-[#615FFF]/10 bg-[#615FFF]/5 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-[#615FFF]">Active</p>
          <p className="mt-2 text-2xl font-semibold text-[#615FFF]">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tiers</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {methods.reduce((sum, method) => sum + method.tiers.length, 0)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">
                {editingMethodId ? "Edit Method" : "Add Method"}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {editingMethodId ? "Update shipping method" : "Create shipping method"}
              </h2>
            </div>

            {editingMethodId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Method Name</label>
              <input
                type="text"
                value={formValues.name}
                onChange={(event) => handleInputChange("name", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                placeholder="Air Shipping"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Slug</label>
              <input
                type="text"
                value={formValues.slug}
                onChange={(event) => handleInputChange("slug", slugify(event.target.value))}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                placeholder="air-shipping"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
              <textarea
                value={formValues.description}
                onChange={(event) => handleInputChange("description", event.target.value)}
                className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                placeholder="Method notes or delivery context"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Delivery Min Days</label>
              <input
                type="number"
                min="0"
                value={formValues.delivery_min_days}
                onChange={(event) => handleInputChange("delivery_min_days", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Delivery Max Days</label>
              <input
                type="number"
                min="0"
                value={formValues.delivery_max_days}
                onChange={(event) => handleInputChange("delivery_max_days", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Minimum Weight (kg)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formValues.minimum_weight_kg}
                onChange={(event) => handleInputChange("minimum_weight_kg", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Sort Order</label>
              <input
                type="number"
                min="0"
                value={formValues.sort_order}
                onChange={(event) => handleInputChange("sort_order", event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
              />
            </div>
          </div>

          <label className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={formValues.is_active}
              onChange={(event) =>
                setFormValues((current) => ({
                  ...current,
                  is_active: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-300 text-[#615FFF] focus:ring-[#615FFF]"
            />
            Active method
          </label>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">Weight Tiers</p>
                <p className="mt-1 text-sm text-slate-500">Define price per kg by total shipping weight.</p>
              </div>

              <button
                type="button"
                onClick={handleAddTier}
                className="rounded-xl border border-[#615FFF]/20 bg-white px-4 py-2 text-sm font-semibold text-[#615FFF] transition-colors hover:border-[#615FFF]/40"
              >
                Add Tier
              </button>
            </div>

            <div className="space-y-3">
              {formValues.tiers.map((tier) => (
                <div key={tier.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                        Min Weight
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tier.min_weight_kg}
                        onChange={(event) => handleTierChange(tier.id, "min_weight_kg", event.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                        Max Weight
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tier.max_weight_kg}
                        onChange={(event) => handleTierChange(tier.id, "max_weight_kg", event.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                        placeholder="No limit"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                        Price / kg
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tier.price_per_kg}
                        onChange={(event) => handleTierChange(tier.id, "price_per_kg", event.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                        Sort Order
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={tier.sort_order}
                        onChange={(event) => handleTierChange(tier.id, "sort_order", event.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveTier(tier.id)}
                      disabled={formValues.tiers.length === 1}
                      className="text-sm font-medium text-rose-500 transition-colors hover:text-rose-600 disabled:cursor-not-allowed disabled:text-slate-300"
                    >
                      Remove tier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5552e6] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {isSaving ? "Saving..." : editingMethodId ? "Update Method" : "Create Method"}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">Method List</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Configured methods</h2>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search methods"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF] sm:max-w-sm"
            />
          </div>

          {filteredMethods.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
              No international shipping methods found.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMethods.map((method) => (
                <article key={method.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{method.name}</p>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            method.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {method.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">Slug: {method.slug}</p>
                      <p className="text-xs text-slate-500">
                        Delivery: {formatDeliveryWindow(method)} | Minimum: {method.minimum_weight_kg} kg
                      </p>
                      {method.description ? (
                        <p className="text-sm text-slate-500">{method.description}</p>
                      ) : null}
                      <p className="text-xs text-slate-500">{method.tiers.length} tier(s)</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(method)}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(method)}
                        className="rounded-xl border border-[#615FFF]/20 bg-[#615FFF]/5 px-4 py-2 text-sm font-medium text-[#615FFF] transition-colors hover:bg-[#615FFF]/10"
                      >
                        {method.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
