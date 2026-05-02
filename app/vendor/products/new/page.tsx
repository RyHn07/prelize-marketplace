"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import ProductForm from "@/components/product/product-form";
import { getCurrentVendorMembership, getVendorWorkspaceAccessState } from "@/lib/marketplace-access";
import { getSupabaseClient } from "@/lib/supabase-client";
import { createVendorProductRecord, updateVendorProductRecord } from "@/lib/vendor-product-actions";

export default function VendorNewProductPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasVendorWorkspaceAccess, setHasVendorWorkspaceAccess] = useState(false);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const validateAccess = async () => {
      const access = await getVendorWorkspaceAccessState(supabase);
      const membership = await getCurrentVendorMembership(supabase);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasVendorWorkspaceAccess(Boolean(membership));
      setActiveVendorId(membership?.vendor_id ?? null);
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
        Loading vendor product form...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Add Product</h1>
        <p className="mt-3 text-sm text-slate-500">Please login to access your vendor products.</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (!hasVendorWorkspaceAccess || !activeVendorId) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Add Product</h1>
        <p className="mt-3 text-sm text-slate-500">No vendor account found.</p>
        <p className="mt-2 text-xs text-slate-400">
          Ask an admin to connect your user to a vendor in `vendor_members` with active status.
        </p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-6">
        <Link
          href="/vendor/products"
          className="inline-flex text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700"
        >
          Back to Products
        </Link>
      </div>
      <ProductForm
        key="vendor-new-product"
        mode="create"
        record={null}
        allowedVendorIds={[activeVendorId]}
        canAssignPlatformProducts={false}
        forcedVendorId={activeVendorId}
        onSave={(mode, payload, productId) =>
          mode === "create"
            ? createVendorProductRecord(payload)
            : updateVendorProductRecord(productId ?? "", payload)
        }
      />
    </section>
  );
}
