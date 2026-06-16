"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import TailadminAddProductPreview from "@/components/admin/products/tailadmin-add-product-preview";
import ProductForm from "@/components/product/product-form";
import { createAdminProductRecord, updateAdminProductRecord } from "@/lib/admin-product-actions";

export default function AdminNewProductPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasProductManagementAccess, setHasProductManagementAccess] = useState(false);
  const [manageableVendorIds, setManageableVendorIds] = useState<string[]>([]);
  const [canAssignPlatformProducts, setCanAssignPlatformProducts] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const validateAccess = async () => {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as {
        user?: { email?: string | null; role?: string | null } | null;
      } | null;

      if (!isMounted) {
        return;
      }

      const user = response.ok ? payload?.user ?? null : null;
      const isAdmin = user?.role === "platform_admin";
      setUserEmail(user?.email ?? null);
      setHasProductManagementAccess(isAdmin);
      setManageableVendorIds([]);
      setCanAssignPlatformProducts(isAdmin);
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
    <section className="w-full space-y-6">
      <div className="hidden" aria-hidden="true">
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
      </div>
      <TailadminAddProductPreview />
    </section>
  );
}
