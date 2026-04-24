"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  getQuoteCount,
  QUOTE_STORAGE_KEY,
  QUOTE_UPDATED_EVENT,
} from "@/components/quote/quote-utils";

function CartIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="9" cy="20" r="1" />
      <circle cx="17" cy="20" r="1" />
      <path d="M3 4h2l2.4 10.5a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H7" />
    </svg>
  );
}

export default function HeaderQuoteButton() {
  const [quoteCount, setQuoteCount] = useState(0);

  useEffect(() => {
    const updateQuoteCount = () => {
      setQuoteCount(getQuoteCount());
    };

    updateQuoteCount();

    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key || event.key === QUOTE_STORAGE_KEY) {
        updateQuoteCount();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(QUOTE_UPDATED_EVENT, updateQuoteCount);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(QUOTE_UPDATED_EVENT, updateQuoteCount);
    };
  }, []);

  return (
    <Link
      href="/cart"
      className="relative flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white transition-colors hover:bg-[#615FFF]"
      aria-label="Cart"
    >
      {quoteCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#615FFF] px-1 text-[10px] font-bold leading-none text-white">
          {quoteCount}
        </span>
      ) : null}
      <CartIcon />
    </Link>
  );
}
