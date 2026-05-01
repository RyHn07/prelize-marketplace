"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import ProductForm from "@/components/product/product-form";
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
          key="new-product"
          mode="create"
          record={null}
          allowedVendorIds={manageableVendorIds}
          canAssignPlatformProducts={canAssignPlatformProducts}
        />
      </section>
  );
}
