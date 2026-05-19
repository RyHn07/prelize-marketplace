import Header from "@/components/Header";

import AccountPageClient from "./account-page-client";

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <Header />
      <AccountPageClient />
    </main>
  );
}
