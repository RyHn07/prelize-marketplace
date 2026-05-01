"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import ProductForm from "@/components/product/product-form";
import { getProductManagementAccessState } from "@/lib/marketplace-access";
import { getProductEditorRecord, getProductEditorRecordForVendors } from "@/lib/products/queries";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { ProductEditorRecord } from "@/types/product-db";

export default function AdminEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasProductManagementAccess, setHasProductManagementAccess] = useState(false);
  const [manageableVendorIds, setManageableVendorIds] = useState<string[]>([]);
  const [canAssignPlatformProducts, setCanAssignPlatformProducts] = useState(true);
  const [record, setRecord] = useState<ProductEditorRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadPage = async () => {
      const resolvedParams = await params;
      const access = await getProductManagementAccessState(supabase);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasProductManagementAccess(access.hasProductManagementAccess);
      setManageableVendorIds(access.manageableVendorIds);
      setCanAssignPlatformProducts(access.hasPlatformAdminAccess);

      if (!access.userEmail) {
        setLoading(false);
        return;
      }

      if (!access.hasProductManagementAccess) {
        setLoading(false);
        return;
      }

      const { data, error } = access.hasPlatformAdminAccess
        ? await getProductEditorRecord(resolvedParams.id)
        : await getProductEditorRecordForVendors(resolvedParams.id, access.manageableVendorIds);

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

    loadPage();

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

  if (!hasProductManagementAccess) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Edit Product</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have product management access</p>
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
          href="/admin/products"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
            href="/admin/products"
            className="inline-flex text-sm font-medium text-[#615FFF] transition-colors hover:text-[#5552e6]"
          >
            Back to Products
          </Link>
        </div>
        <ProductForm
          key={record.product.id}
          mode="edit"
          record={record}
          allowedVendorIds={manageableVendorIds}
          canAssignPlatformProducts={canAssignPlatformProducts}
        />
      </section>
  );
}
