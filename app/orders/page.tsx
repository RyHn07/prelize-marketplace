import Header from "@/components/Header";

import OrdersPageClient from "./orders-page-client";

export default function OrdersPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="print-hidden">
        <Header />
      </div>
      <OrdersPageClient />
    </main>
  );
}
