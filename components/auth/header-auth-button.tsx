"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { getEmailAvatarUrl } from "@/lib/account/email-avatar";

type HeaderUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatarUrl: string | null;
};

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

function getUserInitial(user: HeaderUser) {
  const fullName = user.name ?? "";

  if (fullName.trim()) {
    return fullName.trim().charAt(0).toUpperCase();
  }

  if (typeof user.email === "string" && user.email.trim()) {
    return user.email.trim().charAt(0).toUpperCase();
  }

  return "U";
}

function getUserAvatarUrl(user: HeaderUser) {
  if (user.avatarUrl?.trim()) {
    return user.avatarUrl;
  }

  return getEmailAvatarUrl(user.email, 88);
}

function HeaderAvatar({ user }: { user: HeaderUser }) {
  const avatarUrl = getUserAvatarUrl(user);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  if (avatarUrl && !imageFailed) {
    return (
      <Image
        src={avatarUrl}
        alt={user.email ?? "My account"}
        fill
        sizes="44px"
        className="object-cover"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return <span>{getUserInitial(user)}</span>;
}

export default function HeaderAuthButton() {
  const router = useRouter();
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json()) as { user?: HeaderUser | null };

        if (isMounted) {
          setUser(data.user ?? null);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isMounted = false;
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
      className="relative inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:border-[#615FFF]/30 hover:text-[#615FFF]"
      aria-label="My account"
      title={user.email ?? "My account"}
    >
      <HeaderAvatar user={user} />
    </Link>
  );
}
