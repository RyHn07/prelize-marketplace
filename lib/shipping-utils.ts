// lib/shipping-utils.ts

type ShippingProfile = {
  id: string
  name: string
  ratePerKg: number
}

type CDDTier = {
  minQty: number
  maxQty: number | null
  charge: number
}

type CndsShippingTier = {
  minQty: number
  maxQty: number | null
  price: number
}

type CndsShippingProfile = {
  id: string
  name: string
  pricingType: "unit" | "fixed"
  tiers: CndsShippingTier[]
}

export type CartItem = {
  productId: string
  name: string
  image: string
  variation: string
  variantId?: string | null
  price: number
  quantity: number
  weight?: number
  shippingProfile?: ShippingProfile
  cddTiers?: CDDTier[]
  cndsProfile?: CndsShippingProfile | null
}

/* ----------------------------------------
   1. PRODUCT WEIGHT
---------------------------------------- */

export function calculateProductWeight(items: CartItem[]) {
  let totalWeight = 0
  let hasUnknownWeight = false

  for (const item of items) {
    if (!item.weight) {
      hasUnknownWeight = true
      continue
    }
    totalWeight += item.weight * item.quantity
  }

  if (hasUnknownWeight) {
    return {
      totalWeight: null,
      hasUnknownWeight: true
    }
  }

  return {
    totalWeight,
    hasUnknownWeight: false
  }
}

/* ----------------------------------------
   2. CDD CALCULATION
---------------------------------------- */

export function calculateCDD(items: CartItem[]) {
  const totalQuantity = items.reduce(
    (sum, item) => sum + item.quantity,
    0
  )

  const tiers = items[0]?.cddTiers

  let ratePerItem = 10 // fallback

  if (tiers && tiers.length > 0) {
    const matchedTier = tiers.find(t =>
      totalQuantity >= t.minQty &&
      (t.maxQty === null || totalQuantity <= t.maxQty)
    )

    if (matchedTier) {
      ratePerItem = matchedTier.charge
    }
  }

  return {
    totalQuantity,
    ratePerItem,
    cddCharge: totalQuantity * ratePerItem
  }
}

function getMatchedCndsTier(quantity: number, tiers: CndsShippingTier[]) {
  return tiers.find((tier) =>
    quantity >= tier.minQty &&
    (tier.maxQty === null || quantity <= tier.maxQty)
  ) ?? null
}

export function calculateCndsShipping(items: CartItem[]) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const profile = items[0]?.cndsProfile ?? null

  if (!profile || profile.tiers.length === 0) {
    return {
      totalQuantity,
      profileName: null,
      pricingType: null,
      matchedTier: null,
      shippingCost: 0
    }
  }

  const matchedTier = getMatchedCndsTier(totalQuantity, profile.tiers)

  if (!matchedTier) {
    return {
      totalQuantity,
      profileName: profile.name,
      pricingType: profile.pricingType,
      matchedTier: null,
      shippingCost: 0
    }
  }

  const shippingCost =
    profile.pricingType === "unit"
      ? totalQuantity * matchedTier.price
      : matchedTier.price

  return {
    totalQuantity,
    profileName: profile.name,
    pricingType: profile.pricingType,
    matchedTier,
    shippingCost
  }
}

function calculateImmediateCharge(items: CartItem[]) {
  const cnds = calculateCndsShipping(items)

  if (cnds.profileName) {
    return {
      label: "cnds" as const,
      amount: cnds.shippingCost
    }
  }

  const cdd = calculateCDD(items)

  return {
    label: "cdd" as const,
    amount: cdd.cddCharge
  }
}

function roundCurrency(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

function allocateFixedAmountByQuantity(items: CartItem[], totalAmount: number) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

  if (totalQuantity <= 0) {
    return items.map(() => 0)
  }

  let allocated = 0

  return items.map((item, index) => {
    if (index === items.length - 1) {
      return roundCurrency(totalAmount - allocated)
    }

    const share = roundCurrency((totalAmount * item.quantity) / totalQuantity)
    allocated += share
    return share
  })
}

export function calculateImmediateChargeBreakdown(items: CartItem[]) {
  const cnds = calculateCndsShipping(items)

  if (cnds.profileName && cnds.matchedTier) {
    const matchedTierPrice = cnds.matchedTier.price

    if (cnds.pricingType === "unit") {
      const itemCosts = items.map((item) => roundCurrency(item.quantity * matchedTierPrice))

      return {
        label: "cnds" as const,
        total: roundCurrency(itemCosts.reduce((sum, itemCost) => sum + itemCost, 0)),
        profileId: items[0]?.cndsProfile?.id ?? null,
        itemCosts
      }
    }

    return {
      label: "cnds" as const,
      total: roundCurrency(cnds.shippingCost),
      profileId: items[0]?.cndsProfile?.id ?? null,
      itemCosts: allocateFixedAmountByQuantity(items, cnds.shippingCost)
    }
  }

  const cdd = calculateCDD(items)

  return {
    label: "cdd" as const,
    total: roundCurrency(cdd.cddCharge),
    profileId: null,
    itemCosts: items.map((item) => roundCurrency(item.quantity * cdd.ratePerItem))
  }
}

/* ----------------------------------------
   3. SHIPPING CALCULATION
---------------------------------------- */

export function calculateShipping(items: CartItem[]) {
  const { totalWeight, hasUnknownWeight } =
    calculateProductWeight(items)

  const profile = items[0]?.shippingProfile

  if (hasUnknownWeight || !totalWeight || !profile) {
    return {
      totalWeight: null,
      shippingCost: null,
      status: "Shipping weight required" as const
    }
  }

  return {
    totalWeight,
    shippingCost: totalWeight * profile.ratePerKg,
    status: "Calculated" as const
  }
}

/* ----------------------------------------
   4. CART TOTALS
---------------------------------------- */

export function calculateCartTotals(
  groupedItems: Record<string, CartItem[]>
) {
  let totalQuantity = 0
  let productPrice = 0
  let cddCharge = 0
  let shippingCost = 0
  let hasUnknownShipping = false

  for (const productId in groupedItems) {
    const items = groupedItems[productId]

    // Quantity + price
    for (const item of items) {
      totalQuantity += item.quantity
      productPrice += item.price * item.quantity
    }

    // Immediate charge: CNDS first, legacy CDD fallback for older products
    const immediateCharge = calculateImmediateCharge(items)
    cddCharge += immediateCharge.amount

    // Shipping
    const shipping = calculateShipping(items)

    if (shipping.status === "Shipping weight required") {
      hasUnknownShipping = true
    } else if (shipping.shippingCost) {
      shippingCost += shipping.shippingCost
    }
  }

  return {
    totalQuantity,
    productPrice,
    cddCharge,
    shippingCost: hasUnknownShipping ? null : shippingCost,
    hasUnknownShipping,
    payNow: productPrice + cddCharge,
    payOnDelivery: hasUnknownShipping ? null : shippingCost
  }
}

export function calculateCartDisplayTotals(
  groupedItems: Record<string, CartItem[]>
) {
  const totals = calculateCartTotals(groupedItems)

  return {
    totalQuantity: totals.totalQuantity,
    productPrice: totals.productPrice,
    cndsShipping: totals.cddCharge,
    subtotal: totals.productPrice,
    total: totals.payNow
  }
}
