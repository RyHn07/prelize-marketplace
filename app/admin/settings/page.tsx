"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  DEFAULT_PLATFORM_SETTINGS,
  toPlatformSettingsFormValues,
  toPlatformSettingsUpsertPayload,
} from "@/lib/platform-settings";
import type { PlatformSettingsFormValues, PlatformSettingsRow } from "@/types/platform-settings";

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not saved yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SettingsField({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="text-sm text-slate-500">{hint}</p>
      </div>
      {children}
    </label>
  );
}

function ImageSettingsField({
  label,
  hint,
  value,
  disabled,
  uploading,
  uploadLabel,
  onUpload,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  disabled: boolean;
  uploading: boolean;
  uploadLabel: string;
  onUpload: (file: File | null) => Promise<void>;
  onChange: (value: string) => void;
}) {
  return (
    <SettingsField label={label} hint={hint}>
      <div className="space-y-3">
        <input
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://example.com/image.png"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
        />

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900">
            {uploading ? "Uploading..." : uploadLabel}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={disabled || uploading}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                void onUpload(file);
                event.target.value = "";
              }}
            />
          </label>

          {value ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange("")}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 disabled:cursor-not-allowed"
            >
              Remove image
            </button>
          ) : null}
        </div>

        {value ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <img src={value} alt={`${label} preview`} className="h-20 w-auto max-w-full rounded-xl object-contain" />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            {uploading ? "Uploading image..." : "No image uploaded yet."}
          </div>
        )}
      </div>
    </SettingsField>
  );
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<"" | "logo" | "favicon" | "share">("");
  const [formValues, setFormValues] = useState<PlatformSettingsFormValues>(
    DEFAULT_PLATFORM_SETTINGS,
  );

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      const response = await fetch("/api/admin/settings", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        userEmail?: string | null;
        settings?: PlatformSettingsRow | null;
      } | null;

      if (!isMounted) {
        return;
      }

      if (!response.ok || !payload) {
        setUserEmail(response.status === 401 ? null : "");
        setHasAdminAccess(response.status !== 403);
        setErrorMessage(payload?.error ?? "Unable to load settings.");
        setFormValues(DEFAULT_PLATFORM_SETTINGS);
        setLoading(false);
        return;
      }

      const settings = payload.settings ?? null;
      setUserEmail(payload.userEmail ?? null);
      setHasAdminAccess(true);
      setFormValues(toPlatformSettingsFormValues(settings));
      setLastUpdatedAt(settings?.updated_at ?? null);
      setLoading(false);
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFieldChange = <Field extends keyof PlatformSettingsFormValues>(
    field: Field,
    value: PlatformSettingsFormValues[Field],
  ) => {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
    setSuccessMessage("");
  };

  const handleReset = () => {
    setFormValues(DEFAULT_PLATFORM_SETTINGS);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleAssetUpload = async (
    field: "logo_url" | "favicon_url" | "share_image_url",
    file: File | null,
    uploadingState: "" | "logo" | "favicon" | "share",
  ) => {
    if (!file) {
      return;
    }

    setUploadingField(uploadingState);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      setErrorMessage("VPS media upload endpoint is not configured yet. Paste an existing image URL instead.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to upload image right now.");
    } finally {
      setUploadingField("");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = toPlatformSettingsUpsertPayload(formValues);

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const response = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json().catch(() => null)) as {
      error?: string;
      settings?: PlatformSettingsRow;
    } | null;

    if (!response.ok || !result?.settings) {
      setErrorMessage(result?.error ?? "Unable to save settings.");
      setSaving(false);
      return;
    }

    const settings = result.settings;
    setFormValues(toPlatformSettingsFormValues(settings));
    setLastUpdatedAt(settings.updated_at);
    setSuccessMessage("Platform settings saved successfully.");
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading settings...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Settings</h1>
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
        <h1 className="text-2xl font-semibold text-slate-900">Admin Settings</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have admin access</p>
      </div>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">
            Admin Dashboard
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Settings</h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Manage site identity, share preview assets, and reusable support copy from one place.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Last Updated
          </p>
          <p className="mt-1 text-sm font-medium text-slate-700">{formatDateTime(lastUpdatedAt)}</p>
        </div>
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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-[1.8fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">
                General
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Marketplace identity</h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <SettingsField
                label="Site title"
                hint="Used for browser title, search results, and social share title fallback."
              >
                <input
                  type="text"
                  value={formValues.site_title}
                  onChange={(event) => handleFieldChange("site_title", event.target.value)}
                  placeholder="Prelize Marketplace"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                />
              </SettingsField>

              <SettingsField
                label="Short title"
                hint="A compact brand label for logo text, metadata template, and small UI spaces."
              >
                <input
                  type="text"
                  value={formValues.site_short_title}
                  onChange={(event) => handleFieldChange("site_short_title", event.target.value)}
                  placeholder="Prelize"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                />
              </SettingsField>

              <SettingsField
                label="Site URL"
                hint="Used as the canonical site base for metadata and share links."
              >
                <input
                  type="url"
                  value={formValues.site_url}
                  onChange={(event) => handleFieldChange("site_url", event.target.value)}
                  placeholder="https://example.com"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                />
              </SettingsField>

              <SettingsField
                label="Marketplace name"
                hint="Used as the main admin-facing store label and future storefront fallback."
              >
                <input
                  type="text"
                  value={formValues.marketplace_name}
                  onChange={(event) => handleFieldChange("marketplace_name", event.target.value)}
                  placeholder="Prelize"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                />
              </SettingsField>

              <SettingsField
                label="Support email"
                hint="Primary address for order and account help."
              >
                <input
                  type="email"
                  value={formValues.support_email}
                  onChange={(event) => handleFieldChange("support_email", event.target.value)}
                  placeholder="support@example.com"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                />
              </SettingsField>

              <SettingsField
                label="Support phone"
                hint="Phone or WhatsApp number the ops team wants buyers to use."
              >
                <input
                  type="text"
                  value={formValues.support_phone}
                  onChange={(event) => handleFieldChange("support_phone", event.target.value)}
                  placeholder="+8801XXXXXXXXX"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                />
              </SettingsField>

              <div className="md:col-span-2">
                <SettingsField
                  label="Site description"
                  hint="Used for search metadata and social link preview description."
                >
                  <textarea
                    rows={4}
                    value={formValues.site_description}
                    onChange={(event) => handleFieldChange("site_description", event.target.value)}
                    placeholder="Source wholesale products with a cleaner marketplace workflow."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                  />
                </SettingsField>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">
                Currency
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">CNY business pricing</h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <SettingsField label="Base currency" hint="Product buying price and profit are stored against this currency.">
                <input
                  type="text"
                  value={formValues.base_currency}
                  readOnly
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none"
                />
              </SettingsField>

              <SettingsField label="Display currency" hint="Customer-facing product and order prices use this currency.">
                <input
                  type="text"
                  value={formValues.display_currency}
                  readOnly
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none"
                />
              </SettingsField>

              <SettingsField label="CNY to BDT rate" hint="Used when product buying price plus profit is converted for buyers.">
                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={formValues.cny_to_bdt_rate}
                  onChange={(event) => handleFieldChange("cny_to_bdt_rate", event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                />
              </SettingsField>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">
                Branding Assets
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Logo, favicon, and share image</h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <ImageSettingsField
                label="Website logo"
                hint="Shown in the storefront header and used as the main visual brand mark."
                value={formValues.logo_url}
                disabled={saving}
                uploading={uploadingField === "logo"}
                uploadLabel="Upload Logo"
                onUpload={(file) => handleAssetUpload("logo_url", file, "logo")}
                onChange={(value) => handleFieldChange("logo_url", value)}
              />

              <ImageSettingsField
                label="Favicon icon"
                hint="Used in browser tabs, bookmarks, and app icons where supported."
                value={formValues.favicon_url}
                disabled={saving}
                uploading={uploadingField === "favicon"}
                uploadLabel="Upload Favicon"
                onUpload={(file) => handleAssetUpload("favicon_url", file, "favicon")}
                onChange={(value) => handleFieldChange("favicon_url", value)}
              />

              <div className="md:col-span-2">
                <ImageSettingsField
                  label="Share banner image"
                  hint="Shown when someone shares your site link on Facebook, WhatsApp, Messenger, and similar apps."
                  value={formValues.share_image_url}
                  disabled={saving}
                  uploading={uploadingField === "share"}
                  uploadLabel="Upload Share Image"
                  onUpload={(file) => handleAssetUpload("share_image_url", file, "share")}
                  onChange={(value) => handleFieldChange("share_image_url", value)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">
                Customer Support Copy
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Reusable guidance</h2>
            </div>

            <div className="space-y-5">
              <SettingsField
                label="Order support message"
                hint="A reusable internal default for order help, confirmations, or post-purchase communication."
              >
                <textarea
                  rows={4}
                  value={formValues.order_support_message}
                  onChange={(event) =>
                    handleFieldChange("order_support_message", event.target.value)
                  }
                  placeholder="Need help with your order? Contact our support team with your order number."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                />
              </SettingsField>

              <SettingsField
                label="Shipping support message"
                hint="A reusable note for shipping updates, delivery expectations, or logistics coordination."
              >
                <textarea
                  rows={4}
                  value={formValues.shipping_support_message}
                  onChange={(event) =>
                    handleFieldChange("shipping_support_message", event.target.value)
                  }
                  placeholder="Shipping schedules depend on the selected method and destination. Contact support for updates."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
                />
              </SettingsField>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">
              Save
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Update platform settings</h2>
            <p className="mt-3 text-sm text-slate-500">
              These values are saved in Supabase and now drive storefront branding, metadata, and
              future support workflows.
            </p>

            <div className="mt-6 space-y-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center rounded-xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                Reset to Defaults
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">
              Notes
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>Settings are stored as one singleton record for the marketplace.</li>
              <li>Logo is used in the storefront header, and favicon/share image power browser and social previews.</li>
              <li>Admin access now prefers platform roles and falls back to the legacy admin email allowlist.</li>
              <li>Run the new site identity migration before saving these new fields in production.</li>
            </ul>
          </div>
        </div>
      </form>
    </section>
  );
}
