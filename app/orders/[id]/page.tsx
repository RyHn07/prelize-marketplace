import Header from "@/components/Header";

import OrderDetailsPageClient from "./order-details-page-client";

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <OrderDetailsPageClient params={params} />
    </main>
  );
}
