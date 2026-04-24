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

export type CartItem = {
  productId: string
  name: string
  image: string
  variation: string
  price: number
  quantity: number
  weight?: number
  shippingProfile?: ShippingProfile
  cddTiers?: CDDTier[]
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

    // CDD
    const cdd = calculateCDD(items)
    cddCharge += cdd.cddCharge

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