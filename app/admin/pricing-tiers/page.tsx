import { Suspense } from "react";

import PricingTierProfileManager from "@/components/pricing-tiers/pricing-tier-profile-manager";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading pricing tier profiles...</div>}>
      <PricingTierProfileManager mode="admin" />
    </Suspense>
  );
}
