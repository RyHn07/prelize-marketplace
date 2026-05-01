"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import ProductForm from "@/components/product/product-form";
import { getVendorWorkspaceAccessState } from "@/lib/marketplace-access";
import { getProductEditorRecordForVendors } from "@/lib/products/queries";
import { getSupabaseClient } from "@/lib/supabase-client";
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
    const supabase = getSupabaseClient();

    const loadPage = async () => {
      const resolvedParams = await params;
      const access = await getVendorWorkspaceAccessState(supabase);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasVendorWorkspaceAccess(access.hasVendorWorkspaceAccess);
      setActiveVendorId(access.activeVendorId);

      if (!access.userEmail || !access.hasVendorWorkspaceAccess || !access.activeVendorId) {
        setLoading(false);
        return;
      }

      const { data, error } = await getProductEditorRecordForVendors(resolvedParams.id, [access.activeVendorId]);

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
        Loading...
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
        <p className="mt-3 text-sm text-slate-500">Your account does not have vendor product access yet.</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-5xl rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Edit Product</h1>
        <p className="mt-3 text-sm font-medium text-rose-600">{errorMessage}</p>
      </div>
    );
  }

  if (!record?.product) {
    return (
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Product not found</h1>
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
        key={record.product.id}
        mode="edit"
        record={record}
        allowedVendorIds={[activeVendorId]}
        canAssignPlatformProducts={false}
      />
    </section>
  );
}
