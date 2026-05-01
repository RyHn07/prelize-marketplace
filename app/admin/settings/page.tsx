"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getAdminAccessState } from "@/lib/admin-access";
import {
  DEFAULT_PLATFORM_SETTINGS,
  PLATFORM_SETTINGS_SINGLETON_KEY,
  toPlatformSettingsFormValues,
  toPlatformSettingsUpsertPayload,
} from "@/lib/platform-settings";
import { getSupabaseClient } from "@/lib/supabase-client";
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

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<PlatformSettingsFormValues>(
    DEFAULT_PLATFORM_SETTINGS,
  );

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadSettings = async () => {
      const access = await getAdminAccessState(supabase);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasAdminAccess(access.hasAdminAccess);

      if (!access.userEmail) {
        setLoading(false);
        return;
      }

      if (!access.hasAdminAccess) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("singleton_key", PLATFORM_SETTINGS_SINGLETON_KEY)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(
          error.message.toLowerCase().includes("relation")
            ? "Platform settings table is missing. Run the latest Supabase migration, then reload this page."
            : "Unable to load platform settings right now.",
        );
        setFormValues(DEFAULT_PLATFORM_SETTINGS);
        setLoading(false);
        return;
      }

      const settings = (data ?? null) as PlatformSettingsRow | null;
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const supabase = getSupabaseClient();
    const payload = toPlatformSettingsUpsertPayload(formValues);

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { data, error } = await supabase
      .from("platform_settings")
      .upsert(payload as never, {
        onConflict: "singleton_key",
      })
      .select("*")
      .single();

    if (error) {
      setErrorMessage(
        error.message.toLowerCase().includes("relation")
          ? "Platform settings table is missing. Run the latest Supabase migration, then save again."
          : "Unable to save platform settings right now.",
      );
      setSaving(false);
      return;
    }

    const settings = data as PlatformSettingsRow;
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
    <section className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">
            Admin Dashboard
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Settings</h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Manage the marketplace identity and the support copy the admin team can reuse across
            customer-facing flows.
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

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Marketplace Name</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formValues.marketplace_name.trim() || DEFAULT_PLATFORM_SETTINGS.marketplace_name}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Support Email</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {formValues.support_email.trim() || "Not configured"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Support Phone</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {formValues.support_phone.trim() || "Not configured"}
          </p>
        </div>
      </div>

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
              These values are saved in Supabase and can be reused by future storefront, order, and
              support workflows.
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
              <li>Admin access now prefers platform roles and falls back to the legacy admin email allowlist.</li>
              <li>
                This page prepares the data layer for future role-based admin settings and
                storefront reuse.
              </li>
            </ul>
          </div>
        </div>
      </form>
    </section>
  );
}
