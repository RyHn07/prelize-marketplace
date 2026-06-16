"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getProductsForVendors } from "@/lib/products/queries";
import { getPgDataClient } from "@/lib/browser-app-client";
import { fetchVendorOnboardingStatus } from "@/lib/vendor-onboarding";
import type {
  CndsShippingProfileRow,
  ProductDbRow,
  VendorRow,
} from "@/types/product-db";

type SettingsState = {
  vendor: VendorRow | null;
  products: ProductDbRow[];
  cndsProfiles: CndsShippingProfileRow[];
};

function getProductStatus(product: ProductDbRow) {
  if (product.status === "active" || product.status === "disabled" || product.status === "draft") {
    return product.status;
  }

  return product.is_active ? "active" : "disabled";
}

function getSetupStateLabel(isReady: boolean) {
  return isReady ? "Ready" : "Needs setup";
}

function getSetupStateClasses(isReady: boolean) {
  return isReady
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

function initialsFromName(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "VW";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function formatDateTime(value: string | null | undefined) {
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

function ReadonlyInput({ value, placeholder }: { value: string | null | undefined; placeholder: string }) {
  return (
    <input
      type="text"
      value={value ?? ""}
      readOnly
      placeholder={placeholder}
      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none"
    />
  );
}

function ReadonlyTextarea({ value, placeholder }: { value: string | null | undefined; placeholder: string }) {
  return (
    <textarea
      rows={4}
      value={value ?? ""}
      readOnly
      placeholder={placeholder}
      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none"
    />
  );
}

export default function VendorShopSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof fetchVendorOnboardingStatus>> | null>(null);
  const [settings, setSettings] = useState<SettingsState>({
    vendor: null,
    products: [],
    cndsProfiles: [],
  });
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const dataClient = getPgDataClient();

    const loadSettings = async () => {
      try {
        const onboardingStatus = await fetchVendorOnboardingStatus();

        if (!isMounted) {
          return;
        }

        setStatus(onboardingStatus);

        if (!onboardingStatus.vendorId) {
          return;
        }

        const vendorId = onboardingStatus.vendorId;
        const [{ data: vendor }, productResult, { data: cndsProfiles }] = await Promise.all([
          dataClient.from("vendors").select("*").eq("id", vendorId).maybeSingle(),
          getProductsForVendors([vendorId], dataClient),
          dataClient.from("cnds_shipping_profiles").select("*").eq("vendor_id", vendorId).order("created_at", { ascending: false }),
        ]);

        if (!isMounted) {
          return;
        }

        setSettings({
          vendor: (vendor as VendorRow | null) ?? null,
          products: productResult.data,
          cndsProfiles: (cndsProfiles ?? []) as CndsShippingProfileRow[],
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to load shop settings.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeProductCount = useMemo(
    () => settings.products.filter((product) => getProductStatus(product) === "active").length,
    [settings.products],
  );

  const setupChecklist = [
    {
      title: "Catalog is live",
      ready: activeProductCount > 0,
      helper:
        activeProductCount > 0
          ? `${activeProductCount} active product${activeProductCount === 1 ? "" : "s"} visible to buyers.`
          : "Publish at least one product so your storefront can start converting visits.",
      href: "/vendor/products",
    },
    {
      title: "Shipping profiles are configured",
      ready: settings.cndsProfiles.length > 0,
      helper:
        settings.cndsProfiles.length > 0
          ? `${settings.cndsProfiles.length} CNDS profile${settings.cndsProfiles.length === 1 ? "" : "s"} ready for use.`
          : "Add a shipping profile to avoid manual operational follow-up later.",
      href: "/vendor/cnds",
    },
  ];

  if (loading) {
    return (
      <section className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Loading shop settings...
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Shop Settings</h1>
          <p className="mt-3 text-sm font-medium text-rose-600">{errorMessage}</p>
        </div>
      </section>
    );
  }

  const vendorName = settings.vendor?.name ?? status?.vendorName ?? "Vendor Workspace";
  const vendorBadge = status?.vendorRole ? status.vendorRole.toUpperCase() : "VENDOR";
  const storefrontInitials = initialsFromName(vendorName);
  const vendorStatusLabel = settings.vendor?.status ?? status?.vendorStatus ?? "pending";

  return (
    <section className="w-full space-y-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">
            Vendor Dashboard
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Shop Settings</h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Review your vendor identity, contact details, and operational setup from one workspace.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Last Updated
          </p>
          <p className="mt-1 text-sm font-medium text-slate-700">{formatDateTime(settings.vendor?.updated_at)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.8fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">
                General
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Vendor identity</h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <SettingsField
                label="Shop name"
                hint="The vendor name shown in internal tools and future storefront contexts."
              >
                <ReadonlyInput value={vendorName} placeholder="Vendor Workspace" />
              </SettingsField>

              <SettingsField
                label="Shop slug"
                hint="The stable vendor URL identifier assigned by the marketplace team."
              >
                <ReadonlyInput value={settings.vendor?.slug} placeholder="vendor-slug" />
              </SettingsField>

              <SettingsField
                label="Vendor role"
                hint="Your current role inside this vendor workspace."
              >
                <ReadonlyInput value={vendorBadge} placeholder="VENDOR" />
              </SettingsField>

              <SettingsField
                label="Vendor status"
                hint="Current marketplace approval state for this vendor account."
              >
                <ReadonlyInput value={vendorStatusLabel} placeholder="pending" />
              </SettingsField>

              <div className="md:col-span-2">
                <SettingsField
                  label="Description"
                  hint="The vendor profile copy currently stored for this shop."
                >
                  <ReadonlyTextarea
                    value={settings.vendor?.description}
                    placeholder="No vendor description added yet."
                  />
                </SettingsField>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">
                Contact Details
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Support and operations</h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <SettingsField
                label="Contact email"
                hint="Primary vendor email for marketplace operations."
              >
                <ReadonlyInput value={settings.vendor?.contact_email} placeholder="Not added yet" />
              </SettingsField>

              <SettingsField
                label="Phone"
                hint="Phone or WhatsApp number for operational follow-up."
              >
                <ReadonlyInput value={settings.vendor?.contact_phone} placeholder="Not added yet" />
              </SettingsField>

              <div className="md:col-span-2">
                <SettingsField
                  label="Address"
                  hint="Vendor address currently attached to this shop."
                >
                  <ReadonlyTextarea value={settings.vendor?.address} placeholder="Not added yet" />
                </SettingsField>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">
                Store Readiness
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Operational checklist</h2>
            </div>

            <div className="space-y-3">
              {setupChecklist.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-[#615FFF]/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getSetupStateClasses(item.ready)}`}>
                      {getSetupStateLabel(item.ready)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.helper}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">
              Profile
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Vendor snapshot</h2>

            <div className="mt-6 space-y-5">
              <div>
                {settings.vendor?.logo_url ? (
                  <div
                    className="h-20 w-20 rounded-[24px] border border-slate-200 bg-slate-50"
                    style={{
                      backgroundImage: `url("${settings.vendor.logo_url}")`,
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "cover",
                    }}
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#615FFF] text-xl font-semibold tracking-[0.18em] text-white">
                    {storefrontInitials}
                  </div>
                )}

                <div className="mt-4 rounded-2xl border border-dashed border-[#615FFF]/25 bg-[#615FFF]/5 px-4 py-3 text-sm text-slate-600">
                  Managing as <span className="font-semibold text-slate-900">{vendorBadge}</span>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Vendor ID</p>
                  <p className="mt-1 break-all text-sm font-medium text-slate-900">{status?.vendorId ?? "Not available"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Products</p>
                  <p className="mt-1 text-sm text-slate-700">{activeProductCount} active / {settings.products.length} total</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">CNDS Profiles</p>
                  <p className="mt-1 text-sm text-slate-700">{settings.cndsProfiles.length} configured</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">
              Actions
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Manage setup</h2>
            <p className="mt-3 text-sm text-slate-500">
              Vendor profile edits are controlled by admin records. Use these links to complete the parts vendors can manage now.
            </p>

            <div className="mt-6 space-y-3">
              <Link
                href="/vendor/products/new"
                className="inline-flex w-full items-center justify-center rounded-xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Add Product
              </Link>
              <Link
                href="/vendor/cnds"
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
              >
                Manage Domestic Delivery
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">
              Notes
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>Shop identity comes from the vendor record assigned to your account.</li>
              <li>Products and domestic delivery profiles are managed from their dedicated vendor pages.</li>
              <li>Contact an admin if the shop name, logo, or contact details need to change.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
