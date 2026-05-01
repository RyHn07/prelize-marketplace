"use client";

import * as React from "react";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

import VendorForm, { toVendorFormValues, toVendorPayload } from "@/components/vendor/vendor-form";
import { getAdminAccessState } from "@/lib/admin-access";
import { getSupabaseClient } from "@/lib/supabase-client";
import { updateVendor } from "@/lib/vendors/actions";
import { getVendorById } from "@/lib/vendors/queries";
import type { VendorRow } from "@/types/product-db";

export default function AdminEditVendorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const vendorId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [vendor, setVendor] = useState<VendorRow | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  React.useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadVendor = async () => {
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

      const result = await getVendorById(vendorId);

      if (!isMounted) {
        return;
      }

      if (result.error) {
        setErrorMessage("Unable to load this vendor right now.");
        setLoading(false);
        return;
      }

      if (!result.data) {
        setErrorMessage("Vendor not found.");
        setLoading(false);
        return;
      }

      setVendor(result.data);
      setLoading(false);
    };

    void loadVendor();

    return () => {
      isMounted = false;
    };
  }, [vendorId]);

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
        <h1 className="text-2xl font-semibold text-slate-900">Edit Vendor</h1>
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
        <h1 className="text-2xl font-semibold text-slate-900">Edit Vendor</h1>
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

      {vendor ? (
        <VendorForm
          key={vendor.id}
          initialValues={toVendorFormValues(vendor)}
          title="Edit Vendor"
          submitLabel="Update Vendor"
          isSubmitting={saving}
          errorMessage={errorMessage}
          successMessage={successMessage}
          onSubmit={async (values) => {
            const payload = toVendorPayload(values);

            if (!payload.name) {
              setErrorMessage("Vendor name is required.");
              return;
            }

            setSaving(true);
            setErrorMessage("");
            setSuccessMessage("");

            const result = await updateVendor(vendor.id, payload);

            if (result.error || !result.data) {
              setErrorMessage(result.error?.message ?? "Unable to save the vendor right now.");
              setSaving(false);
              return;
            }

            setVendor(result.data);
            setSuccessMessage("Vendor updated successfully.");
            setSaving(false);
            router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}
