import type { InternationalShippingMethodRow } from "@/types/product-db";

function roundCurrency(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculateTotalWeightKg(
  items: Array<{ weight?: number | null; quantity: number }>,
) {
  let totalWeightKg = 0;
  let hasUnknownWeight = false;

  items.forEach((item) => {
    if (typeof item.weight !== "number" || !Number.isFinite(item.weight) || item.weight <= 0) {
      hasUnknownWeight = true;
      return;
    }

    totalWeightKg += item.weight * item.quantity;
  });

  return {
    totalWeightKg: roundCurrency(totalWeightKg),
    hasUnknownWeight,
  };
}

export function calculateInternationalShippingEstimate(
  method: InternationalShippingMethodRow | null,
  totalWeightKg: number,
  hasUnknownWeight: boolean,
) {
  if (!method || hasUnknownWeight || totalWeightKg <= 0) {
    return {
      status: "pending_review" as const,
      total: null,
      matchedTier: null,
      warning: hasUnknownWeight ? "Product weight is missing for one or more selected items." : null,
    };
  }

  if (totalWeightKg < method.minimum_weight_kg) {
    return {
      status: "pending_review" as const,
      total: null,
      matchedTier: null,
      warning: `Minimum weight for ${method.name} is ${method.minimum_weight_kg} kg.`,
    };
  }

  const matchedTier =
    method.tiers.find(
      (tier) =>
        totalWeightKg >= tier.min_weight_kg &&
        (tier.max_weight_kg === null || totalWeightKg <= tier.max_weight_kg),
    ) ?? null;

  if (!matchedTier) {
    return {
      status: "pending_review" as const,
      total: null,
      matchedTier: null,
      warning: `No shipping tier matched ${totalWeightKg} kg for ${method.name}.`,
    };
  }

  return {
    status: "calculated" as const,
    total: roundCurrency(totalWeightKg * matchedTier.price_per_kg),
    matchedTier,
    warning: null,
  };
}

export function formatDeliveryWindow(
  minimumDays: number | null,
  maximumDays: number | null,
) {
  if (minimumDays !== null && maximumDays !== null) {
    return `${minimumDays}-${maximumDays} days`;
  }

  if (minimumDays !== null) {
    return `${minimumDays}+ days`;
  }

  if (maximumDays !== null) {
    return `Up to ${maximumDays} days`;
  }

  return "Pending review";
}
