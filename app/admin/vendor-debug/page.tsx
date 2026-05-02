"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { getAdminAccessState } from "@/lib/admin-access";
import { getSupabaseClient } from "@/lib/supabase-client";
import {
  getVendorMemberships,
  getVendorOwnedProductsDebug,
  getVendorProductCounts,
  getVendors,
  type VendorOwnedProductDebugRow,
} from "@/lib/vendors/queries";
import type { VendorMemberRow, VendorRow } from "@/types/product-db";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminVendorDebugPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [memberships, setMemberships] = useState<VendorMemberRow[]>([]);
  const [products, setProducts] = useState<VendorOwnedProductDebugRow[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadDebugData = async () => {
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

      const [vendorsResult, membershipsResult, productsResult, countsResult] = await Promise.all([
        getVendors(),
        getVendorMemberships(),
        getVendorOwnedProductsDebug(),
        getVendorProductCounts(),
      ]);

      if (!isMounted) {
        return;
      }

      const firstError =
        vendorsResult.error ??
        membershipsResult.error ??
        productsResult.error ??
        countsResult.error;

      if (firstError) {
        setErrorMessage(firstError.message);
      }

      setVendors(vendorsResult.data);
      setMemberships(membershipsResult.data);
      setProducts(productsResult.data);
      setProductCounts(countsResult.data);
      setLoading(false);
    };

    void loadDebugData();

    return () => {
      isMounted = false;
    };
  }, []);

  const vendorNameById = useMemo(
    () => new Map(vendors.map((vendor) => [vendor.id, vendor.name])),
    [vendors],
  );

  const membershipsByVendorId = useMemo(() => {
    const map = new Map<string, VendorMemberRow[]>();

    memberships.forEach((membership) => {
      const current = map.get(membership.vendor_id) ?? [];
      current.push(membership);
      map.set(membership.vendor_id, current);
    });

    return map;
  }, [memberships]);

  const productsByVendorId = useMemo(() => {
    const map = new Map<string, VendorOwnedProductDebugRow[]>();

    products.forEach((product) => {
      if (!product.vendor_id) {
        return;
      }

      const current = map.get(product.vendor_id) ?? [];
      current.push(product);
      map.set(product.vendor_id, current);
    });

    return map;
  }, [products]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading vendor debug data...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Vendor Debug</h1>
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
        <h1 className="text-2xl font-semibold text-slate-900">Vendor Debug</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have admin access</p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Admin Debug</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Vendor Debug</h1>
        <p className="text-sm text-slate-500">
          Use this page to confirm vendor accounts, memberships, and product ownership without changing upload or order flows.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Vendors</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{vendors.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Vendor Members</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{memberships.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Vendor-Owned Products</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{products.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Vendors With Products</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{Object.keys(productCounts).length}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">Snapshot</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Vendor ownership overview</h2>
        </div>

        {vendors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900">No vendors found</h3>
            <p className="mt-2 text-sm text-slate-500">Create vendors first, then return here to inspect ownership data.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {vendors.map((vendor) => {
              const vendorMemberships = membershipsByVendorId.get(vendor.id) ?? [];
              const vendorProducts = productsByVendorId.get(vendor.id) ?? [];

              return (
                <article key={vendor.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_1fr]">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Vendor</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{vendor.name}</p>
                      <p className="mt-1 break-all text-xs text-slate-500">ID: {vendor.id}</p>
                      <p className="mt-1 text-xs text-slate-500">Slug: {vendor.slug}</p>
                      <p className="mt-1 text-xs text-slate-500">Status: {vendor.status}</p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Memberships</p>
                      {vendorMemberships.length === 0 ? (
                        <p className="mt-1 text-sm text-slate-500">No vendor memberships found.</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {vendorMemberships.map((membership) => (
                            <div key={membership.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                              <p className="break-all text-xs font-medium text-slate-900">User: {membership.user_id}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {membership.role} / {membership.status} / added {formatDate(membership.created_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Owned Products</p>
                      {vendorProducts.length === 0 ? (
                        <p className="mt-1 text-sm text-slate-500">No products currently assigned to this vendor.</p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {vendorProducts.slice(0, 5).map((product) => (
                            <div key={product.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                              <p className="text-sm font-medium text-slate-900">{product.name}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {product.slug} / {product.status ?? "unknown status"}
                              </p>
                              <p className="mt-1 break-all text-xs text-slate-400">Product ID: {product.id}</p>
                            </div>
                          ))}
                          {vendorProducts.length > 5 ? (
                            <p className="text-xs text-slate-400">Showing 5 of {vendorProducts.length} products.</p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {products.length > 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">Quick Product Map</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Recent vendor-owned products</h2>
          </div>

          <div className="space-y-3">
            {products.slice(0, 12).map((product) => (
              <article key={product.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Product</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{product.name}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Vendor</p>
                    <p className="mt-1 text-sm text-slate-700">{product.vendor_id ? vendorNameById.get(product.vendor_id) ?? "Unknown vendor" : "Unassigned"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Vendor ID</p>
                    <p className="mt-1 break-all text-sm text-slate-700">{product.vendor_id ?? "None"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Slug / Status</p>
                    <p className="mt-1 text-sm text-slate-700">{product.slug} / {product.status ?? "unknown"}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
