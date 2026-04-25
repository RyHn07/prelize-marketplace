import Link from "next/link";

export default function AdminSettingsPage() {
  return (
    <section className="mx-auto max-w-5xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">
          Admin Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-500">
          Settings can live here next. This route is ready inside the admin-only layout.
        </p>

        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Back to Website
          </Link>
        </div>
      </div>
    </section>
  );
}
