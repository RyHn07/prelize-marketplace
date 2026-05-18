import Header from "@/components/Header";

import CartPageClient from "./cart-page-client";

export default function CartPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <CartPageClient />
    </main>
  );
}
