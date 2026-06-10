import Header from "@/components/Header";

import AccountPageClient from "./account-page-client";

type AccountPageProps = {
  searchParams: Promise<{ view?: string | string[] }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const resolvedSearchParams = await searchParams;
  const view = Array.isArray(resolvedSearchParams.view)
    ? resolvedSearchParams.view[0]
    : resolvedSearchParams.view;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Header />
      <AccountPageClient initialView={view === "orders" ? "orders" : "dashboard"} />
    </main>
  );
}
