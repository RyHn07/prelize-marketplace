"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getAdminAccessState } from "@/lib/admin-access";
import { getSupabaseClient } from "@/lib/supabase-client";

export default function AdminCategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const validateAccess = async () => {
      const access = await getAdminAccessState(supabase);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasAdminAccess(access.hasAdminAccess);
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
        Loading...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Categories</h1>
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
        <h1 className="text-2xl font-semibold text-slate-900">Admin Categories</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have admin access</p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-5xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">
          Admin Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Categories</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-500">
          Category management can be added next. The admin shell is ready, and this section is
          reserved for category tools.
        </p>

        <div className="mt-6">
          <Link
            href="/admin/products"
            className="inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Manage Products
          </Link>
        </div>
      </div>
    </section>
  );
}
