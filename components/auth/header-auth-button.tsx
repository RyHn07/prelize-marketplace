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

function getUserInitial(user: User) {
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : "";

  if (fullName.trim()) {
    return fullName.trim().charAt(0).toUpperCase();
  }

  if (typeof user.email === "string" && user.email.trim()) {
    return user.email.trim().charAt(0).toUpperCase();
  }

  return "U";
}

export default function HeaderAuthButton() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(hasSupabaseEnv);

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
    <Link
      href="/account"
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-[#615FFF]/30 hover:text-[#615FFF]"
      aria-label="My account"
      title={user.email ?? "My account"}
    >
      <span>{getUserInitial(user)}</span>
    </Link>
  );
}
