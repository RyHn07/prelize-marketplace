"use client";

import * as React from "react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import VendorForm, {
  DEFAULT_VENDOR_FORM_VALUES,
  toVendorPayload,
} from "@/components/vendor/vendor-form";
import { getAdminAccessState } from "@/lib/admin-access";
import { getSupabaseClient } from "@/lib/supabase-client";
import { createVendor } from "@/lib/vendors/actions";

export default function AdminNewVendorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  React.useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const validateAccess = async () => {
      const access = await getAdminAccessState(supabase);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasAdminAccess(access.hasAdminAccess);
      setLoading(false);
    };

    void validateAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Add Vendor</h1>
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
        <h1 className="text-2xl font-semibold text-slate-900">Add Vendor</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have admin access</p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Link
          href="/admin/vendors"
          className="inline-flex text-sm font-medium text-[#615FFF] transition-colors hover:text-[#5552e6]"
        >
          Back to Vendors
        </Link>
      </div>

      <VendorForm
        key="new-vendor"
        initialValues={DEFAULT_VENDOR_FORM_VALUES}
        title="Add Vendor"
        submitLabel="Create Vendor"
        isSubmitting={saving}
        errorMessage={errorMessage}
        onSubmit={async (values) => {
          const payload = toVendorPayload(values);

          if (!payload.name) {
            setErrorMessage("Vendor name is required.");
            return;
          }

          setSaving(true);
          setErrorMessage("");

          const result = await createVendor(payload);

          if (result.error || !result.data) {
            setErrorMessage(result.error?.message ?? "Unable to create the vendor right now.");
            setSaving(false);
            return;
          }

          router.push(`/admin/vendors?status=created&id=${result.data.id}`);
          router.refresh();
        }}
      />
    </section>
  );
}
