# Product Data Audit

Last updated: 2026-04-25

## Purpose

This note captures the current product data shapes in the repo and the main gaps between:

- storefront UI needs
- Supabase product records
- quote/cart/checkout snapshots
- future multivendor requirements

It is meant to guide the next execution step after the recent build-stability fixes.

## Current Reality

The storefront product list and product detail pages are already reading from Supabase:

- `app/products/page.tsx`
- `app/products/[slug]/page.tsx`
- `lib/products/queries.ts`
- `lib/products/storefront.ts`

That means the old roadmap item "move public catalog to Supabase" is mostly complete.

The bigger remaining gap is not catalog page wiring anymore. The bigger gap is data parity and cart/checkout alignment.

## Current Shapes

### Storefront UI shape

Defined in `types/product.ts`:

- `id`
- `slug`
- `name`
- `image`
- `gallery`
- `priceFrom`
- `moq`
- `weight`
- `badge`
- `shortDescription`
- `description`
- `specifications`
- `buyerNotes`
- `category`

### Database product shape

Defined in `types/product-db.ts`:

- `id`
- `category_id`
- `name`
- `slug`
- `description`
- `image_url`
- `price`
- `moq`
- `weight`
- `badge`
- `is_active`
- `created_at`
- `status`
- `product_type`
- `regular_price`
- `discount_price`
- `gallery_images`
- `attributes`
- `cdd_shipping_profile`

There is also `ProductDbVariantRow` for variant records, and the public product detail purchase flow now uses it.

### Quote/cart snapshot shape

Defined in `components/quote/quote-utils.ts`:

- `productId`
- `name`
- `image`
- `productSlug`
- `variation`
- `variantId`
- `price`
- `quantity`

This is still a lightweight purchase snapshot, but it is now more intentional and variant-aware.

The cart and checkout still preserve client-side purchase snapshots for:

- product name
- image
- variation label
- price

The database is used to enrich and validate:

- `slug`
- `weight`
- `image_url`
- product display name

## What Already Works Well

- Public catalog pages already read from Supabase
- Public product detail already reads by slug from Supabase
- Public product listing already maps DB rows into storefront UI shape
- Related products already use Supabase-backed category relationships
- Admin product management already writes and reads Supabase product records
- Cart and checkout already enrich quote items with live product records using `getProductsByIds`

## Main Gaps

### 1. Product detail buying flow is now variant-aware, but richer storefront data is still incomplete

`components/product/product-details-purchase-panel.tsx` now uses:

- real `product_variants`
- real prices
- real MOQs
- real attribute-based option filtering

Remaining gaps:

- shipping messaging is still generic
- richer buying metadata is not yet vendor-aware
- we still need a final decision on richer detail fields

### 2. Quote/cart/checkout still rely on purchase snapshots for core commercial fields

The quote items preserve:

- `name`
- `image`
- `productSlug`
- `variation`
- `variantId`
- `price`

This is the right direction for stable purchase behavior, but we still need to define exactly which fields are snapshots versus which must always be revalidated live.

The current flow now also detects missing or inactive products in cart and checkout and blocks those items from being checked out.

### 3. Seller identity is now neutral in the customer flow, but not yet data-driven

The cart, checkout-adjacent flow, and customer order pages now use neutral marketplace wording instead of the old hardcoded single-seller label.

The remaining gap is that seller identity still is not coming from real vendor data yet.

### 4. Storefront mapper currently uses fallback/generated content for some fields

`lib/products/storefront.ts` currently derives:

- `shortDescription` from `description`
- `specifications` from `attributes` or fallback operational fields
- `buyerNotes` from hardcoded generic notes

This is acceptable temporarily, but it is not full storefront parity yet.

### 5. Reviews are still static UI content

`components/product/product-details-tabs.tsx` uses hardcoded review items.

That is not a blocker for checkout stability, but it is still part of the storefront data gap.

## Recommended Next Implementation Order

### Step 1

Strengthen quote/cart/checkout product snapshots.

Target outcome:

- store a stable product snapshot intentionally
- reload live product data where needed for validation
- handle missing or inactive products gracefully

Status:

- completed for the current buyer flow, with variant-aware snapshots and unavailable-item blocking

### Step 2

Make seller language neutral everywhere now.

Target outcome:

- remove hardcoded single-seller wording from cart, checkout, and orders
- leave room for future vendor labels

Status:

- completed for current customer-facing flows, but not yet replaced with real vendor data

### Step 3

Decide whether `shortDescription`, `buyerNotes`, and richer specs should live:

- directly on `products`
- in separate product detail tables
- or in structured JSON fields

## Practical Conclusion

The current repo is already beyond the earlier roadmap assumption that the public catalog still depends mainly on mock products.

The next real milestone is:

- finish remaining storefront detail parity
- stabilize quote/cart/checkout around real product records
- prepare the product model for vendor ownership
