"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchVendorOnboardingStatus } from "@/lib/vendor-onboarding";

export default function VendorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof fetchVendorOnboardingStatus>> | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadStatus = async () => {
      try {
        const onboardingStatus = await fetchVendorOnboardingStatus();

        if (!isMounted) {
          return;
        }

        setStatus(onboardingStatus);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Unable to open vendor entry.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Loading vendor entry...
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Vendor Program</h1>
          <p className="mt-3 text-sm font-medium text-rose-600">{errorMessage}</p>
        </div>
      </section>
    );
  }

  if (!status?.hasVendorMembership && !status?.hasPendingInvitation) {
    return (
      <section className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Vendor Program</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">You are not invited as a vendor</h1>
          <p className="mt-3 text-sm text-slate-500">
            Ask a platform admin to invite your account into the Prelize vendor program first.
          </p>
        </div>
      </section>
    );
  }

  if (status?.hasPendingInvitation && !status?.hasVendorMembership) {
    return (
      <section className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Vendor Program</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Welcome to Prelize Vendor Program</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-500">
            Your account has a pending vendor invitation. Continue to submit your vendor registration details.
          </p>

          <div className="mt-6">
            <Link
              href="/vendor/register"
              className="inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Proceed
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (status?.hasVendorMembership && status.vendorStatus !== "active") {
    return (
      <section className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Vendor Program</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Waiting for admin approval</h1>
          <p className="mt-3 text-sm text-slate-500">
            Your vendor registration has been submitted. The vendor workspace will unlock after admin approval.
          </p>
        </div>
      </section>
    );
  }

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
        {status.vendorId ? <p className="text-sm font-medium text-slate-600">Current vendor ID: {status.vendorId}</p> : null}
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
          <p className="mt-2 text-2xl font-semibold text-slate-900">Ready</p>
          <p className="mt-2 text-sm text-slate-500">Vendor media is now isolated by vendor-specific paths.</p>
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
