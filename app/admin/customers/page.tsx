import Link from "next/link";

export default function AdminCustomersPage() {
  return (
    <section className="mx-auto max-w-5xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">
          Admin Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Customers</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-500">
          Customer management is not built yet, but the admin navigation and layout are now in
          place for it.
        </p>

        <div className="mt-6">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
