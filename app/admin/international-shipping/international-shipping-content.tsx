"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  createAdminInternationalShippingMethodRequest,
  fetchAdminInternationalShippingMethods,
  updateAdminInternationalShippingMethodRequest,
} from "@/lib/international-shipping/actions";
import { getAdminAccessState } from "@/lib/admin-access";
import { getPgDataClient } from "@/lib/browser-app-client";
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
    tiers:
      method.tiers.length > 0
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

export default function InternationalShippingContent() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [methods, setMethods] = useState<InternationalShippingMethodRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [formValues, setFormValues] = useState<MethodFormValue>(createEmptyMethodForm());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const dataClient = getPgDataClient();

    const loadPage = async () => {
      const access = await getAdminAccessState(dataClient);

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
          setErrorMessage(error instanceof Error ? error.message : "Unable to load international shipping methods.");
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
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? method.is_active : !method.is_active);

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        method.name.toLowerCase().includes(query) ||
        method.slug.toLowerCase().includes(query) ||
        (method.description ?? "").toLowerCase().includes(query)
      );
    });
  }, [methods, searchQuery, statusFilter]);

  const selectedMethod = useMemo(
    () => methods.find((method) => method.id === editingMethodId) ?? null,
    [editingMethodId, methods],
  );

  const accentBorder = "focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10";

  const refreshMethods = async () => {
    const result = await fetchAdminInternationalShippingMethods();
    setMethods(result.methods);
  };

  const resetForm = () => {
    setEditingMethodId(null);
    setFormValues(createEmptyMethodForm());
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    resetForm();
  };

  const startCreateMode = () => {
    resetForm();
    setErrorMessage("");
    setSuccessMessage("");
    setIsEditorOpen(true);
  };

  const handleEdit = (method: InternationalShippingMethodRow) => {
    setEditingMethodId(method.id);
    setFormValues(mapMethodToForm(method));
    setSuccessMessage("");
    setErrorMessage("");
    setIsEditorOpen(true);
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

  const handleSubmit = async () => {
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = buildPayload(formValues);

      if (editingMethodId) {
        await updateAdminInternationalShippingMethodRequest(editingMethodId, payload);
        setSuccessMessage("Shipping method updated.");
      } else {
        await createAdminInternationalShippingMethodRequest(payload);
        setSuccessMessage("Shipping method created.");
      }

      await refreshMethods();
      closeEditor();
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
      await updateAdminInternationalShippingMethodRequest(method.id, {
        ...mapMethodToForm(method),
        is_active: !method.is_active,
      });

      await refreshMethods();
      setSuccessMessage(method.is_active ? "Shipping method deactivated." : "Shipping method activated.");
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
    <section className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800">Bangladesh Shipping List</h3>
            <p className="mt-1 text-sm text-gray-500">
              Review China to Bangladesh shipping methods separately from CNDS from one workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg bg-[#615FFF]/8 px-3 py-2 text-sm font-medium text-[#615FFF]">
              {filteredMethods.length} visible
            </div>
            <button
              type="button"
              onClick={startCreateMode}
              className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Add Shipping Method
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-[420px]">
            <label htmlFor="shipping-search" className="sr-only">
              Search shipping methods
            </label>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <SearchIcon />
            </span>
            <input
              id="shipping-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by method name, slug, or description"
              className={`h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 outline-none transition-colors ${accentBorder}`}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:w-40">
              <label htmlFor="shipping-status-filter" className="sr-only">
                Filter by status
              </label>
              <select
                id="shipping-status-filter"
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

        {methods.length === 0 ? (
          <div className="p-6">
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
              No Bangladesh shipping methods yet. Create your first shipping method.
            </div>
          </div>
        ) : filteredMethods.length === 0 ? (
          <div className="p-6">
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
              No matching shipping methods found.
            </div>
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[1080px]">
              <table className="min-w-full">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 sm:px-6">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Slug</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Delivery</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Minimum Weight</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Tiers</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Created At</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMethods.map((method) => (
                    <tr key={method.id} className={editingMethodId === method.id ? "bg-[#615FFF]/5" : ""}>
                      <td className="px-5 py-5 text-left sm:px-6">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800">{method.name}</p>
                          <span className="mt-1 block truncate text-xs text-gray-500">
                            {method.description || "No description added"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-sm text-gray-500">{method.slug}</td>
                      <td className="px-4 py-5 text-sm text-gray-500">{formatDeliveryWindow(method)}</td>
                      <td className="px-4 py-5 text-sm text-gray-500">{method.minimum_weight_kg} kg</td>
                      <td className="px-4 py-5 text-sm font-semibold text-[#615FFF]">{method.tiers.length}</td>
                      <td className="px-4 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            method.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {method.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-5 text-sm text-gray-500">{formatCreatedAt(method.created_at)}</td>
                      <td className="px-4 py-5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(method)}
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleToggleActive(method)}
                            className="inline-flex items-center justify-center rounded-lg border border-[#615FFF]/20 bg-[#615FFF]/5 px-4 py-2 text-sm font-medium text-[#615FFF] transition-colors hover:bg-[#615FFF]/10"
                          >
                            {method.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
                  {selectedMethod ? `Edit ${selectedMethod.name}` : "Create Shipping Method"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure delivery window, minimum weight, and per-kg Bangladesh shipping tiers.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-slate-500 transition-colors hover:border-[#615FFF]/30 hover:text-slate-900"
                aria-label="Close editor"
              >
                ×
              </button>
            </div>

            <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Method Name</label>
                  <input
                    type="text"
                    value={formValues.name}
                    onChange={(event) => handleInputChange("name", event.target.value)}
                    className={`h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors ${accentBorder}`}
                    placeholder="Air Shipping"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Slug</label>
                  <input
                    type="text"
                    value={formValues.slug}
                    onChange={(event) => handleInputChange("slug", slugify(event.target.value))}
                    className={`h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors ${accentBorder}`}
                    placeholder="air-shipping"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    value={formValues.description}
                    onChange={(event) => handleInputChange("description", event.target.value)}
                    rows={4}
                    className={`w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-800 outline-none transition-colors ${accentBorder}`}
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
                    className={`h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors ${accentBorder}`}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Delivery Max Days</label>
                  <input
                    type="number"
                    min="0"
                    value={formValues.delivery_max_days}
                    onChange={(event) => handleInputChange("delivery_max_days", event.target.value)}
                    className={`h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors ${accentBorder}`}
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
                    className={`h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors ${accentBorder}`}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Sort Order</label>
                  <input
                    type="number"
                    min="0"
                    value={formValues.sort_order}
                    onChange={(event) => handleInputChange("sort_order", event.target.value)}
                    className={`h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors ${accentBorder}`}
                  />
                </div>
              </div>

              <label className="mt-4 inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
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
                Active Method
              </label>

              <div className="mt-6 rounded-2xl border border-gray-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Weight Tiers</p>
                    <p className="text-xs text-slate-500">Define price per kg by total shipping weight.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTier}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                  >
                    Add Tier
                  </button>
                </div>

                <div className="space-y-4">
                  {formValues.tiers.map((tier, index) => (
                    <div key={tier.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">Tier {index + 1}</p>
                        <button
                          type="button"
                          onClick={() => handleRemoveTier(tier.id)}
                          disabled={formValues.tiers.length === 1}
                          className="text-sm font-medium text-rose-500 disabled:cursor-not-allowed disabled:text-slate-300"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tier.min_weight_kg}
                          onChange={(event) => handleTierChange(tier.id, "min_weight_kg", event.target.value)}
                          className={`h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors ${accentBorder}`}
                          placeholder="Min Weight"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tier.max_weight_kg}
                          onChange={(event) => handleTierChange(tier.id, "max_weight_kg", event.target.value)}
                          className={`h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors ${accentBorder}`}
                          placeholder="Max Weight"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={tier.price_per_kg}
                          onChange={(event) => handleTierChange(tier.id, "price_per_kg", event.target.value)}
                          className={`h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition-colors ${accentBorder}`}
                          placeholder="Price / kg"
                        />
                        <input
                          type="number"
                          min="0"
                          value={tier.sort_order}
                          onChange={(event) => handleTierChange(tier.id, "sort_order", event.target.value)}
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
                  disabled={isSaving}
                  className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : selectedMethod ? "Update Method" : "Create Method"}
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
