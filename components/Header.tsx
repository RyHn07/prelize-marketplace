import Link from "next/link";

import HeaderWishlistButton from "@/components/wishlist/header-wishlist-button";

const topBarLinks = [
  { href: "https://facebook.com", label: "Facebook" },
  { href: "https://instagram.com", label: "Instagram" },
  { href: "https://youtube.com", label: "YouTube" },
  { href: "https://whatsapp.com", label: "WhatsApp" },
];

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" strokeLinecap="round" />
      <path
        d="M12 3c2.8 3 4.2 6 4.2 9s-1.4 6-4.2 9c-2.8-3-4.2-6-4.2-9s1.4-6 4.2-9Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M4 7.5A2.5 2.5 0 0 1 6.5 5h9.8A2.7 2.7 0 0 1 19 7.7V9H6.5A2.5 2.5 0 0 0 4 11.5v-4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 11.5A2.5 2.5 0 0 1 6.5 9H20v8.5a1.5 1.5 0 0 1-1.5 1.5h-12A2.5 2.5 0 0 1 4 16.5v-5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16.5" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PlaneIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M21 16.5 13.6 13l-2.5 5.2-2.2-.7 1.3-4.9-4.1-1.9a1 1 0 0 1-.4-1.4l.2-.3 5.3 1 2.9-5.7a1.8 1.8 0 0 1 2.4-.8l.4.2-1.7 6.1 5.1 2.4a2.2 2.2 0 0 1 1.1 2.9Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlagBangladeshIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" fill="#006A4E" />
      <circle cx="11" cy="12" r="4" fill="#F42A41" />
    </svg>
  );
}

function LifeRingIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v5" strokeLinecap="round" />
      <path d="M12 15v5" strokeLinecap="round" />
      <path d="M4 12h5" strokeLinecap="round" />
      <path d="M15 12h5" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon({ className = "h-5 w-5 text-slate-400" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

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

function GridIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="4" y="4" width="6" height="6" rx="1.2" />
      <rect x="14" y="4" width="6" height="6" rx="1.2" />
      <rect x="4" y="14" width="6" height="6" rx="1.2" />
      <rect x="14" y="14" width="6" height="6" rx="1.2" />
    </svg>
  );
}

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

function FacebookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor">
      <path d="M13.3 20v-6.1h2.1l.3-2.5h-2.4V9.8c0-.7.2-1.3 1.3-1.3h1.2V6.3c-.2 0-.8-.1-1.5-.1-2.3 0-3.8 1.4-3.8 4v1.2H8.5v2.5h2.1V20h2.7Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor">
      <path d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3Zm0 1.8A2.7 2.7 0 0 0 4.8 7.5v9a2.7 2.7 0 0 0 2.7 2.7h9a2.7 2.7 0 0 0 2.7-2.7v-9a2.7 2.7 0 0 0-2.7-2.7h-9ZM17 6.7a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM12 7.3a4.7 4.7 0 1 1 0 9.4 4.7 4.7 0 0 1 0-9.4Zm0 1.8a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8Z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor">
      <path d="M20.6 7.7a2.7 2.7 0 0 0-1.9-1.9C17 5.3 12 5.3 12 5.3s-5 0-6.7.5a2.7 2.7 0 0 0-1.9 1.9A28 28 0 0 0 3 12a28 28 0 0 0 .4 4.3 2.7 2.7 0 0 0 1.9 1.9c1.7.5 6.7.5 6.7.5s5 0 6.7-.5a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 21 12a28 28 0 0 0-.4-4.3ZM10.4 15V9l5 3-5 3Z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor">
      <path d="M12 3.8a8.2 8.2 0 0 0-7 12.5L4 20.2l4-1a8.2 8.2 0 1 0 4-15.4Zm0 14.8c-1.2 0-2.3-.3-3.3-.9l-.2-.1-2.4.6.6-2.3-.2-.2A6.6 6.6 0 1 1 12 18.6Zm3.6-4.9-.9-.5c-.3-.1-.4-.1-.6.1l-.5.6c-.1.1-.2.2-.5.1-.2-.1-1-.4-1.8-1.1-.6-.6-1.1-1.3-1.2-1.5-.1-.2 0-.3.1-.4l.4-.4.2-.4c.1-.1 0-.3 0-.4l-.4-1c-.1-.3-.3-.3-.4-.3h-.4c-.2 0-.4.1-.5.3-.2.2-.7.7-.7 1.7s.7 1.9.8 2c.1.1 1.4 2.2 3.4 3 .5.2.9.3 1.2.4.5.1.9.1 1.3.1.4-.1 1.1-.4 1.3-.8.2-.4.2-.9.1-.9-.1-.1-.2-.1-.4-.2Z" />
    </svg>
  );
}

export default function Header() {
  return (
    <header className="border-b border-slate-200/80 bg-white">
      <div className="border-b border-slate-200/80 bg-slate-50/80">
        <div className="mx-auto flex max-w-7xl justify-end px-4 py-2.5 text-xs text-slate-500 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md transition-colors hover:text-[#615FFF]"
            >
              <GlobeIcon />
              <span className="font-medium text-slate-700">EN</span>
              <ChevronDownIcon />
            </button>

            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md transition-colors hover:text-[#615FFF]"
            >
              <WalletIcon />
              <span className="font-medium text-slate-700">BDT</span>
              <ChevronDownIcon />
            </button>

            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md transition-colors hover:text-[#615FFF]"
            >
              <PlaneIcon />
              <span className="font-medium text-slate-700">SHIP TO</span>
              <FlagBangladeshIcon />
              <ChevronDownIcon />
            </button>
            
            <Link
              href="/support"
              className="flex items-center gap-1.5 rounded-md transition-colors hover:text-[#615FFF]"
            >
              <LifeRingIcon />
              <span className="font-medium text-slate-700">SUPPORT</span>
            </Link>

            <div className="mx-1 hidden h-4 w-px bg-slate-200 sm:block" />

            {topBarLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-slate-500 transition-colors hover:text-[#615FFF]"
                aria-label={link.label}
              >
                {link.label === "Facebook" && <FacebookIcon />}
                {link.label === "Instagram" && <InstagramIcon />}
                {link.label === "YouTube" && <YouTubeIcon />}
                {link.label === "WhatsApp" && <WhatsAppIcon />}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
          <div className="flex items-center justify-between gap-4 lg:w-auto lg:flex-none lg:justify-start">
            <Link
              href="/"
              className="shrink-0 text-[2rem] font-extrabold tracking-tight text-slate-900 transition-colors hover:text-[#615FFF]"
            >
              <span className="text-slate-900">PRE</span>
              <span className="text-[#615FFF]">LIZE</span>
            </Link>
          </div>

          <div className="flex flex-col gap-3 lg:flex-1 lg:flex-row lg:items-center lg:gap-5">
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 lg:flex-none"
            >
              <GridIcon />
              <span>Categories</span>
              <ChevronDownIcon />
            </button>

            <form className="flex-1" role="search">
              <label htmlFor="header-search" className="sr-only">
                Search products
              </label>
              <div className="flex h-[3.2rem] items-center rounded-full border border-slate-200/90 bg-white pl-5 pr-2 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all focus-within:border-[#615FFF]/50 focus-within:ring-4 focus-within:ring-[#615FFF]/10">
                <input
                  id="header-search"
                  type="text"
                  placeholder="Search products, suppliers, categories, or brands"
                  className="w-full border-0 bg-transparent pr-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#615FFF] text-white shadow-sm transition-colors hover:bg-[#5552e6]"
                  aria-label="Search"
                >
                  <SearchIcon className="h-5 w-5 text-white" />
                </button>
              </div>
            </form>

            <div className="flex flex-wrap items-center gap-3.5 lg:flex-none lg:justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-2 text-sm font-semibold text-[#615FFF] transition-colors hover:text-[#5552e6] lg:ml-1"
              >
                <span>Services</span>
                <ChevronDownIcon />
              </button>

              <HeaderWishlistButton />

              <Link
                href="/cart"
                className="relative flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white transition-colors hover:bg-[#615FFF]"
                aria-label="Cart"
              >
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#615FFF] px-1 text-[10px] font-bold leading-none text-white">
                  2
                </span>
                <CartIcon />
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center gap-2.5 rounded-full px-1 text-sm font-medium text-slate-700 transition-colors hover:text-[#615FFF]"
              >
                <UserIcon />
                <span className="whitespace-nowrap leading-none">Login / Sign Up</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
