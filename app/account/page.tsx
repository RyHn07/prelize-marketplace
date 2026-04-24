"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import { getSupabaseClient } from "@/lib/supabase-client";

export default function AccountPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };

    getUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 text-gray-900">
        <Header />

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
            Loading...
          </div>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50 text-gray-900">
        <Header />

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <h1 className="text-2xl font-semibold text-gray-900">My Account</h1>
            <p className="mt-3 text-sm text-gray-500">
              Please login to access your account
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-2 font-medium"
              style={{ color: "#ffffff" }}
            >
              Go to Login
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Header />

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">My Account</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your marketplace activity and account details.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">Email</p>
              <p className="mt-2 text-base font-medium text-gray-900">{user.email}</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">Account Status</p>
              <p className="mt-2 text-base font-medium text-gray-900">Active</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Link
              href="/orders"
              className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-[#615FFF]/40 hover:shadow-sm"
            >
              <p className="text-base font-medium text-gray-900">My Orders</p>
              <p className="mt-2 text-sm text-gray-500">
                Track and manage your placed orders.
              </p>
            </Link>

            <Link
              href="/cart"
              className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-[#615FFF]/40 hover:shadow-sm"
            >
              <p className="text-base font-medium text-gray-900">Shopping Cart</p>
              <p className="mt-2 text-sm text-gray-500">
                Review selected items before checkout.
              </p>
            </Link>

            <Link
              href="/products"
              className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-[#615FFF]/40 hover:shadow-sm"
            >
              <p className="text-base font-medium text-gray-900">Browse Products</p>
              <p className="mt-2 text-sm text-gray-500">
                Explore more wholesale products.
              </p>
            </Link>
          </div>

          <div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-[#615FFF] px-6 py-2 font-medium"
              style={{ color: "#ffffff" }}
            >
              Logout
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
