"use client";

import { useEffect, useState } from "react";

import { getCurrentVendorMembership } from "@/lib/marketplace-access";
import { getSupabaseClient } from "@/lib/supabase-client";

export default function VendorDashboardPage() {
  const [vendorId, setVendorId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadVendorMembership = async () => {
      const membership = await getCurrentVendorMembership(supabase);

      if (!isMounted) {
        return;
      }

      setVendorId(membership?.vendor_id ?? null);
    };

    void loadVendorMembership();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-6 space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
          Vendor Dashboard
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="max-w-2xl text-sm text-slate-500">
          This vendor workspace is ready. Next we can connect live vendor product, order, and shop data here.
        </p>
        {vendorId ? <p className="text-sm font-medium text-slate-600">Current vendor ID: {vendorId}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Orders</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">Ready</p>
          <p className="mt-2 text-sm text-slate-500">Vendor order workspace shell is in place.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Products</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">Scoped</p>
          <p className="mt-2 text-sm text-slate-500">Product visibility can now be scoped by vendor membership.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Media</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">Pending</p>
          <p className="mt-2 text-sm text-slate-500">Media tools can be connected into this vendor shell next.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Shop Settings</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">Pending</p>
          <p className="mt-2 text-sm text-slate-500">Vendor business settings and storefront identity will live here.</p>
        </div>
      </div>
    </section>
  );
}
