import Link from "next/link";

export default function AuthPageHeaderFallback() {
  return (
    <header className="border-b border-slate-200/80 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-[1.95rem] font-extrabold tracking-tight text-slate-900 transition-colors hover:text-[#615FFF] sm:text-[2rem]"
        >
          <span className="text-[#615FFF]">PRE</span>
          <span className="text-slate-900">LIZE</span>
        </Link>

        <div className="h-5 w-24 rounded-full bg-slate-100" aria-hidden="true" />
      </div>
    </header>
  );
}
