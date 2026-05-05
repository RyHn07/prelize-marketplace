import { Suspense } from "react";

import OrdersContent from "./orders-content";

export default function Page() {
  return (
    <Suspense fallback={<div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Loading orders...</div>}>
      <OrdersContent />
    </Suspense>
  );
}
