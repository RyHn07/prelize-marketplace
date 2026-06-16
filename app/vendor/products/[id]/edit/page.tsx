"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import TailadminAddProductPreview from "@/components/admin/products/tailadmin-add-product-preview";
import ProductForm from "@/components/product/product-form";
import { getCurrentVendorMembership, getVendorWorkspaceAccessState } from "@/lib/marketplace-access";
import { getPgDataClient } from "@/lib/browser-app-client";
import { createVendorProductRecord, getVendorProductEditorRecord, updateVendorProductRecord } from "@/lib/vendor-product-actions";
import type { ProductEditorRecord } from "@/types/product-db";

export default function VendorEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasVendorWorkspaceAccess, setHasVendorWorkspaceAccess] = useState(false);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [record, setRecord] = useState<ProductEditorRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const dataClient = getPgDataClient();

    const loadPage = async () => {
      const resolvedParams = await params;
      const access = await getVendorWorkspaceAccessState(dataClient);
      const membership = await getCurrentVendorMembership(dataClient);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasVendorWorkspaceAccess(Boolean(membership));
      setActiveVendorId(membership?.vendor_id ?? null);

      if (!access.userEmail || !membership?.vendor_id) {
        setLoading(false);
        return;
      }

      const { data, error } = await getVendorProductEditorRecord(resolvedParams.id);

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage(error.message);
        setRecord(null);
        setLoading(false);
        return;
      }

      setRecord(data);
      setLoading(false);
    };

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, [params]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading vendor product...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Edit Product</h1>
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
        <h1 className="text-2xl font-semibold text-slate-900">Edit Product</h1>
        <p className="mt-3 text-sm text-slate-500">No vendor account found.</p>
        <p className="mt-2 text-xs text-slate-400">
          Ask an admin to connect your user to a vendor in `vendor_members` with active status.
        </p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-5xl rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Edit Product</h1>
        <p className="mt-3 text-sm font-medium text-rose-600">{errorMessage}</p>
        <p className="mt-2 text-xs text-slate-400">
          This usually means the product is outside your vendor ownership or the product record could not be loaded.
        </p>
      </div>
    );
  }

  if (!record?.product) {
    return (
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Product not found</h1>
        <p className="mt-3 text-sm text-slate-500">
          This product either does not exist or does not belong to your current vendor account.
        </p>
        <Link
          href="/vendor/products"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
        >
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="hidden" aria-hidden="true">
        <ProductForm
          key={record.product.id}
          mode="edit"
          record={record}
          allowedVendorIds={[activeVendorId]}
          canAssignPlatformProducts={false}
          forcedVendorId={activeVendorId}
          onSave={(mode, payload, productId) =>
            mode === "create"
              ? createVendorProductRecord(payload)
              : updateVendorProductRecord(productId ?? "", payload)
          }
        />
      </div>
      <TailadminAddProductPreview />
    </section>
  );
}
