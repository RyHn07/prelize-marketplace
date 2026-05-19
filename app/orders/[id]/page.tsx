import Header from "@/components/Header";

import OrderDetailsPageClient from "./order-details-page-client";

export default function OrderDetailsPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <OrderDetailsPageClient />
    </main>
  );
}
