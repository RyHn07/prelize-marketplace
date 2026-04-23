"use client";

import { useEffect, useState } from "react";

import {
  getWishlistIds,
  WISHLIST_UPDATED_EVENT,
} from "@/components/wishlist/wishlist-utils";

function HeartIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
    >
      <path
        d="M12 20.5s-6.5-4.3-8.6-8C1.8 9.7 3 6.5 6.3 5.5c2-.6 4 .1 5.7 2 1.7-1.9 3.7-2.6 5.7-2 3.3 1 4.5 4.2 2.9 7-2.1 3.7-8.6 8-8.6 8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HeaderWishlistButton() {
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    const updateWishlistCount = () => {
      setWishlistCount(getWishlistIds().length);
    };

    updateWishlistCount();

    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key || event.key === "prelize-wishlist") {
        updateWishlistCount();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(WISHLIST_UPDATED_EVENT, updateWishlistCount);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(WISHLIST_UPDATED_EVENT, updateWishlistCount);
    };
  }, []);

  return (
    <button
      type="button"
      className="relative flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors hover:bg-[#615FFF]/10 hover:text-[#615FFF]"
      aria-label="Wishlist"
    >
      {wishlistCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#615FFF] px-1 text-[10px] font-bold leading-none text-white">
          {wishlistCount}
        </span>
      ) : null}
      <HeartIcon />
    </button>
  );
}
