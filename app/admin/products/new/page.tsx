"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AdminPageHeader from "@/components/admin/admin-page-header";
import ProductForm from "@/components/product/product-form";
import { createAdminProductRecord, updateAdminProductRecord } from "@/lib/admin-product-actions";
import { getProductManagementAccessState } from "@/lib/marketplace-access";
import { getSupabaseClient } from "@/lib/supabase-client";

export default function AdminNewProductPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasProductManagementAccess, setHasProductManagementAccess] = useState(false);
  const [manageableVendorIds, setManageableVendorIds] = useState<string[]>([]);
  const [canAssignPlatformProducts, setCanAssignPlatformProducts] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const validateAccess = async () => {
      const access = await getProductManagementAccessState(supabase);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasProductManagementAccess(access.hasProductManagementAccess);
      setManageableVendorIds(access.manageableVendorIds);
      setCanAssignPlatformProducts(access.hasPlatformAdminAccess);
      setLoading(false);
    };

    validateAccess();

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
        <h1 className="text-2xl font-semibold text-slate-900">Add Product</h1>
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
        <h1 className="text-2xl font-semibold text-slate-900">Add Product</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have product management access</p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <AdminPageHeader
          eyebrow="Product Editor"
          title="Add Product"
          description="Create a new marketplace product without changing the existing submission logic."
          actions={
            <Link
              href="/admin/products"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/30 hover:text-slate-900"
            >
              Back to Products
            </Link>
          }
        />
      </div>
      <ProductForm
        key="new-product"
        mode="create"
        record={null}
        allowedVendorIds={manageableVendorIds}
        canAssignPlatformProducts={canAssignPlatformProducts}
        onSave={(mode, payload, productId) =>
          mode === "create"
            ? createAdminProductRecord(payload)
            : updateAdminProductRecord(productId ?? "", payload)
        }
      />
    </section>
  );
}
