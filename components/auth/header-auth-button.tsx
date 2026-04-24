"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { getSupabaseClient } from "@/lib/supabase-client";

const hasSupabaseEnv =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
    >
      <circle cx="12" cy="8" r="3.25" />
      <path
        d="M5.5 19.5a6.5 6.5 0 0 1 13 0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HeaderAuthButton() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(hasSupabaseEnv);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!hasSupabaseEnv) {
      return;
    }

    let isMounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;
    const supabase = getSupabaseClient();

    supabase.auth.getUser().then(({ data }) => {
      if (isMounted) {
        setUser(data.user ?? null);
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    });

    authSubscription = subscription;

    return () => {
      isMounted = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setIsSigningOut(true);

    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      setUser(null);
      router.push("/");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-2.5 rounded-full px-1 text-sm font-medium text-slate-400">
        <UserIcon />
        <span className="whitespace-nowrap leading-none">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2.5 rounded-full px-1 text-sm font-medium text-slate-700 transition-colors hover:text-[#615FFF]"
      >
        <UserIcon />
        <span className="whitespace-nowrap leading-none">Login / Sign Up</span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
        <UserIcon />
        <span className="max-w-[160px] truncate font-medium">{user.email}</span>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={isSigningOut}
        className="inline-flex items-center rounded-full px-1 text-sm font-medium text-slate-700 transition-colors hover:text-[#615FFF] disabled:cursor-not-allowed disabled:text-slate-400"
      >
        {isSigningOut ? "Logging out..." : "Logout"}
      </button>
    </div>
  );
}
