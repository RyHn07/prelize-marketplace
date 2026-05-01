"use client";

import * as React from "react";

import type { VendorFormValues, VendorStatus, VendorUpsertPayload } from "@/types/product-db";

export const DEFAULT_VENDOR_FORM_VALUES: VendorFormValues = {
  name: "",
  slug: "",
  logo_url: "",
  banner_url: "",
  description: "",
  contact_email: "",
  contact_phone: "",
  address: "",
  status: "pending",
};

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toVendorFormValues(vendor: {
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  status: VendorStatus;
} | null): VendorFormValues {
  if (!vendor) {
    return DEFAULT_VENDOR_FORM_VALUES;
  }

  return {
    name: vendor.name,
    slug: vendor.slug,
    logo_url: vendor.logo_url ?? "",
    banner_url: vendor.banner_url ?? "",
    description: vendor.description ?? "",
    contact_email: vendor.contact_email ?? "",
    contact_phone: vendor.contact_phone ?? "",
    address: vendor.address ?? "",
    status: vendor.status,
  };
}

export function toVendorPayload(values: VendorFormValues): VendorUpsertPayload {
  const trimmedName = values.name.trim();
  const fallbackSlug =
    values.slug.trim() ||
    trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");

  return {
    name: trimmedName,
    slug: fallbackSlug,
    logo_url: normalizeOptionalText(values.logo_url),
    banner_url: normalizeOptionalText(values.banner_url),
    description: normalizeOptionalText(values.description),
    contact_email: normalizeOptionalText(values.contact_email),
    contact_phone: normalizeOptionalText(values.contact_phone),
    address: normalizeOptionalText(values.address),
    status: values.status,
  };
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {hint ? <p className="text-sm text-slate-500">{hint}</p> : null}
      </div>
      {children}
    </label>
  );
}

type VendorFormProps = {
  initialValues: VendorFormValues;
  title: string;
  submitLabel: string;
  isSubmitting: boolean;
  errorMessage?: string;
  successMessage?: string;
  onSubmit: (values: VendorFormValues) => void | Promise<void>;
};

export default function VendorForm({
  initialValues,
  title,
  submitLabel,
  isSubmitting,
  errorMessage = "",
  successMessage = "",
  onSubmit,
}: VendorFormProps) {
  const [values, setValues] = React.useState<VendorFormValues>(initialValues);

  const handleFieldChange = <FieldName extends keyof VendorFormValues>(
    field: FieldName,
    value: VendorFormValues[FieldName],
  ) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="Vendor name" hint="Business or storefront name shown in admin and future storefront areas.">
            <input
              type="text"
              value={values.name}
              onChange={(event) => handleFieldChange("name", event.target.value)}
              placeholder="Eastern Supply House"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
            />
          </Field>

          <Field label="Vendor slug" hint="Used for future vendor profile URLs. Leave blank to auto-generate.">
            <input
              type="text"
              value={values.slug}
              onChange={(event) => handleFieldChange("slug", event.target.value)}
              placeholder="eastern-supply-house"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
            />
          </Field>

          <Field label="Contact email">
            <input
              type="email"
              value={values.contact_email}
              onChange={(event) => handleFieldChange("contact_email", event.target.value)}
              placeholder="vendor@example.com"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
            />
          </Field>

          <Field label="Contact phone">
            <input
              type="text"
              value={values.contact_phone}
              onChange={(event) => handleFieldChange("contact_phone", event.target.value)}
              placeholder="+8801XXXXXXXXX"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
            />
          </Field>

          <Field label="Logo URL" hint="Optional vendor logo for future profile cards and listings.">
            <input
              type="url"
              value={values.logo_url}
              onChange={(event) => handleFieldChange("logo_url", event.target.value)}
              placeholder="https://example.com/logo.png"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
            />
          </Field>

          <Field label="Banner URL" hint="Optional banner for a future vendor storefront page.">
            <input
              type="url"
              value={values.banner_url}
              onChange={(event) => handleFieldChange("banner_url", event.target.value)}
              placeholder="https://example.com/banner.jpg"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Address">
              <textarea
                rows={3}
                value={values.address}
                onChange={(event) => handleFieldChange("address", event.target.value)}
                placeholder="Business address or warehouse location"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Description" hint="Internal summary now, future storefront about copy later.">
              <textarea
                rows={5}
                value={values.description}
                onChange={(event) => handleFieldChange("description", event.target.value)}
                placeholder="Describe the vendor, sourcing strengths, catalog focus, or ops notes."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">Vendor Status</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(["pending", "active", "suspended"] as const).map((status) => {
            const selected = values.status === status;
            const label = status.charAt(0).toUpperCase() + status.slice(1);

            return (
              <label
                key={status}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                  selected ? "border-[#615FFF]/40 bg-[#615FFF]/5" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="vendor-status"
                  checked={selected}
                  onChange={() => handleFieldChange("status", status)}
                  className="h-4 w-4 border-slate-300 text-[#615FFF] focus:ring-[#615FFF]"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{label}</p>
                  <p className="text-xs text-slate-500">
                    {status === "pending"
                      ? "Not approved for active marketplace use yet."
                      : status === "active"
                        ? "Ready for product ownership and future storefront visibility."
                        : "Temporarily blocked from normal marketplace activity."}
                  </p>
                </div>
              </label>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Saving..." : submitLabel}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setValues(initialValues)}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            Reset Form
          </button>
        </div>
      </div>
    </form>
  );
}
