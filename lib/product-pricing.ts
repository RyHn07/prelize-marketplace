import type { CartItem } from "@/lib/shipping-utils";
import type { ProductPricingType, ResolvedProductPricingTier } from "@/types/product-db";

export type ProductPricingConfig = {
  pricingType: ProductPricingType | null;
  tiers: ResolvedProductPricingTier[];
  source?: "profile" | "legacy" | null;
  profileId?: string | null;
  profileName?: string | null;
};

export type ProductGroupPricing = {
  pricingType: ProductPricingType | null;
  matchedTier: ResolvedProductPricingTier | null;
  totalQuantity: number;
  unitPrice: number | null;
  totalPrice: number;
  itemUnitPrices: number[];
  itemTotals: number[];
};

export function roundCurrency(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export const BASE_CURRENCY = "CNY";
export const DISPLAY_CURRENCY = "BDT";
export const DEFAULT_CNY_TO_BDT_RATE = 16;

export type ProductProfitPricingInput = {
  buyingPriceCny: number;
  profitPercent: number;
  exchangeRateCnyToBdt: number;
};

export type ProductProfitPricing = {
  buyingPriceCny: number;
  profitPercent: number;
  profitAmountCny: number;
  sellingPriceCny: number;
  exchangeRateCnyToBdt: number;
  displayPriceBdt: number;
};

export function normalizeCurrencyNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeExchangeRate(value: unknown) {
  const parsed = normalizeCurrencyNumber(value, DEFAULT_CNY_TO_BDT_RATE);
  return parsed > 0 ? parsed : DEFAULT_CNY_TO_BDT_RATE;
}

export function calculateProductProfitPricing(input: ProductProfitPricingInput): ProductProfitPricing {
  const buyingPriceCny = Math.max(0, normalizeCurrencyNumber(input.buyingPriceCny));
  const profitPercent = Math.max(0, normalizeCurrencyNumber(input.profitPercent));
  const exchangeRateCnyToBdt = normalizeExchangeRate(input.exchangeRateCnyToBdt);
  const profitAmountCny = roundCurrency((buyingPriceCny * profitPercent) / 100);
  const sellingPriceCny = roundCurrency(buyingPriceCny + profitAmountCny);

  return {
    buyingPriceCny,
    profitPercent,
    profitAmountCny,
    sellingPriceCny,
    exchangeRateCnyToBdt,
    displayPriceBdt: roundCurrency(sellingPriceCny * exchangeRateCnyToBdt),
  };
}

export function convertCnyBuyingPriceToBdtSellingPrice(
  buyingPriceCny: number,
  profitPercent: number,
  exchangeRateCnyToBdt: number,
) {
  return calculateProductProfitPricing({
    buyingPriceCny,
    profitPercent,
    exchangeRateCnyToBdt,
  }).displayPriceBdt;
}

export function getMatchedProductPricingTier(
  quantity: number,
  tiers: ResolvedProductPricingTier[],
) {
  return (
    tiers.find(
      (tier) =>
        quantity >= tier.min_qty &&
        (tier.max_qty === null || quantity <= tier.max_qty),
    ) ?? null
  );
}

export function calculateProductGroupPricing(items: CartItem[]) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const pricing = items[0]?.productPricing ?? null;
  const hasVariantTierPricing = items.some((item) => item.variantPricing);
  const fallbackUnitPrices = items.map((item) => roundCurrency(item.basePrice ?? item.price));
  const fallbackItemTotals = items.map((item, index) => roundCurrency(item.quantity * fallbackUnitPrices[index]));
  const fallbackTotalPrice = roundCurrency(fallbackItemTotals.reduce((sum, value) => sum + value, 0));

  if (hasVariantTierPricing) {
    const itemUnitPrices = items.map((item, index) => {
      const variantPricing = item.variantPricing;

      if (!variantPricing || item.quantity <= 0) {
        return fallbackUnitPrices[index];
      }

      const matchedTier = getMatchedProductPricingTier(item.quantity, variantPricing.tiers);

      if (!matchedTier) {
        return roundCurrency(variantPricing.fallbackPrice);
      }

      if (variantPricing.pricingType === "unit") {
        return roundCurrency(matchedTier.price);
      }

      return item.quantity > 0 ? roundCurrency(matchedTier.price / item.quantity) : 0;
    });
    const itemTotals = items.map((item, index) => {
      const variantPricing = item.variantPricing;

      if (!variantPricing || item.quantity <= 0) {
        return fallbackItemTotals[index];
      }

      const matchedTier = getMatchedProductPricingTier(item.quantity, variantPricing.tiers);

      if (!matchedTier) {
        return roundCurrency(item.quantity * variantPricing.fallbackPrice);
      }

      if (variantPricing.pricingType === "unit") {
        return roundCurrency(item.quantity * matchedTier.price);
      }

      return roundCurrency(matchedTier.price);
    });

    return {
      pricingType: null,
      matchedTier: null,
      totalQuantity,
      unitPrice: null,
      totalPrice: roundCurrency(itemTotals.reduce((sum, value) => sum + value, 0)),
      itemUnitPrices,
      itemTotals,
    } satisfies ProductGroupPricing;
  }

  if (!pricing || pricing.tiers.length === 0 || totalQuantity <= 0 || !pricing.pricingType) {
    return {
      pricingType: pricing?.pricingType ?? null,
      matchedTier: null,
      totalQuantity,
      unitPrice: null,
      totalPrice: fallbackTotalPrice,
      itemUnitPrices: fallbackUnitPrices,
      itemTotals: fallbackItemTotals,
    } satisfies ProductGroupPricing;
  }

  const matchedTier = getMatchedProductPricingTier(totalQuantity, pricing.tiers);

  if (!matchedTier) {
    return {
      pricingType: pricing.pricingType,
      matchedTier: null,
      totalQuantity,
      unitPrice: null,
      totalPrice: fallbackTotalPrice,
      itemUnitPrices: fallbackUnitPrices,
      itemTotals: fallbackItemTotals,
    } satisfies ProductGroupPricing;
  }

  if (pricing.pricingType === "unit") {
    const unitPrice = roundCurrency(matchedTier.price);
    const itemTotals = items.map((item) => roundCurrency(item.quantity * unitPrice));

    return {
      pricingType: pricing.pricingType,
      matchedTier,
      totalQuantity,
      unitPrice,
      totalPrice: roundCurrency(itemTotals.reduce((sum, value) => sum + value, 0)),
      itemUnitPrices: items.map(() => unitPrice),
      itemTotals,
    } satisfies ProductGroupPricing;
  }

  const fixedTotal = roundCurrency(matchedTier.price);
  const unitPrice = totalQuantity > 0 ? roundCurrency(fixedTotal / totalQuantity) : 0;
  const itemUnitPrices = items.map(() => unitPrice);
  let allocated = 0;
  const itemTotals = items.map((item, index) => {
    if (index === items.length - 1) {
      return roundCurrency(fixedTotal - allocated);
    }

    const total = roundCurrency(item.quantity * unitPrice);
    allocated += total;
    return total;
  });

  return {
    pricingType: pricing.pricingType,
    matchedTier,
    totalQuantity,
    unitPrice,
    totalPrice: fixedTotal,
    itemUnitPrices,
    itemTotals,
  } satisfies ProductGroupPricing;
}
