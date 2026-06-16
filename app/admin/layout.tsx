import { redirect } from "next/navigation";

import AdminShell from "@/components/admin/admin-shell";
import { LEGACY_ADMIN_EMAILS, PLATFORM_ADMIN_ROLE } from "@/lib/admin-access";
import { getCurrentUserFromCookie } from "@/lib/auth/session";

type AdminLayoutProps = {
  children: React.ReactNode;
};

function AdminForbidden() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-500">
          Access denied
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">Admin access required</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          This account does not have permission to access the admin panel.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#615FFF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#5552e6]"
        >
          Return to website
        </a>
      </section>
    </main>
  );
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const user = await getCurrentUserFromCookie();

  if (!user) {
    redirect("/login");
  }

  const hasAdminAccess =
    user.role === PLATFORM_ADMIN_ROLE || LEGACY_ADMIN_EMAILS.includes(user.email.toLowerCase());

  if (!hasAdminAccess) {
    return <AdminForbidden />;
  }

  return <AdminShell>{children}</AdminShell>;
}
