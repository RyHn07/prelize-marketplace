# Current Execution Plan

Last updated: 2026-04-25

## Purpose

This file turns the broader project roadmap into a practical execution order for the current repo state.

It answers:

- what we should do now
- what must be finished before multivendor starts
- where multivendor implementation should begin

## Current Reality

The project already has:

- storefront UI
- auth screens
- cart and checkout flow
- customer orders pages
- admin product flow
- admin order flow
- Supabase-backed product management

The biggest current gap is that the storefront still depends on mock product data while admin product management already uses Supabase.

Because of that, the platform is not ready for full multivendor implementation yet.

## Decision

We should start multivendor planning now, but start multivendor implementation only after the storefront product flow is fully connected to Supabase and cart/checkout no longer depend on mock product records.

## What We Do Now

### Priority 1: Make Supabase the single source of truth for products

This is the current top priority.

Tasks:

- [ ] Audit field usage in `data/mock-products.ts`
- [ ] Audit field usage in `types/product.ts`
- [ ] Audit field usage in `types/product-db.ts`
- [ ] Define one shared product shape for storefront, admin, cart, and orders
- [ ] Confirm which fields come from `products`
- [ ] Confirm which fields need separate tables such as variants, media, and specifications
- [ ] Document missing fields still needed for storefront parity

Definition of done:

- Public product list reads from Supabase
- Public product details page reads from Supabase
- Admin-created products appear on the public storefront
- Product data no longer depends on `mock-products` for main catalog rendering

### Priority 2: Stabilize cart and checkout around real product data

Once product pages are Supabase-backed, cart and checkout should stop depending on mock product records.

Tasks:

- [ ] Remove mock-product lookups from cart and checkout
- [ ] Load product weight, image, and shipping-related fields from real product records
- [ ] Ensure order creation stores a stable snapshot of purchased product data
- [ ] Verify inactive or deleted products do not break existing cart/order flows
- [ ] Replace single-seller assumptions where possible with neutral wording

Definition of done:

- Cart totals and shipping work from database-backed product data
- Checkout creates orders using stable product snapshots
- No critical cart or checkout logic depends on `mock-products`

### Priority 3: Finish the schema decisions that multivendor depends on

Before building vendor UI, we should lock the data model.

Tasks:

- [ ] Finalize product schema for gallery, specs, variants, and short description
- [ ] Decide how `vendor_id` will attach to products
- [ ] Decide whether categories are global or vendor-specific
- [ ] Define `vendors` table fields
- [ ] Define `vendor_members` table for owner/staff access
- [ ] Decide the multivendor order model

Decision needed:

- parent marketplace order plus vendor sub-orders
- or separate vendor-linked orders

Recommendation:

Use one parent marketplace order with vendor sub-orders. It keeps the buyer experience cleaner while still giving vendors scoped fulfillment views.

## When To Start Multivendor

Start multivendor implementation after all of these are true:

- [ ] Storefront products are fully Supabase-backed
- [ ] Cart and checkout do not rely on mock product data
- [ ] Product schema is stable enough to add `vendor_id`
- [ ] Admin access direction is clear enough to support role-based permissions

If those four items are not done, multivendor work will create rework.

## First Multivendor Phase

When we start multivendor, this should be the first implementation phase.

### Phase 1: Multivendor Foundation

- [ ] Create `vendors` table
- [ ] Create `vendor_members` table
- [ ] Add nullable `vendor_id` to `products`
- [ ] Backfill or assign products to vendor records
- [ ] Define vendor statuses such as `pending`, `active`, and `suspended`
- [ ] Replace hardcoded seller labels with real vendor data
- [ ] Show vendor name on product cards, product details, cart, and orders
- [ ] Add role-based permission rules for platform admins and vendor users

Definition of done:

- Every product can belong to a vendor
- Vendor identity exists in the data model
- Seller labels in the UI come from real data
- Permissions can be scoped by vendor

### Phase 2: Vendor-Aware Orders

- [ ] Add vendor-aware order structure
- [ ] Group cart items by vendor
- [ ] Add vendor-level shipping or note support where needed
- [ ] Create vendor-specific order views
- [ ] Keep platform admin visibility across all orders
- [ ] Keep customer order history simple and understandable

### Phase 3: Vendor Experience

- [ ] Vendor dashboard shell
- [ ] Vendor product management
- [ ] Vendor order management
- [ ] Vendor onboarding and approval flow
- [ ] Vendor profile/storefront page

## Recommended Working Order

1. Finish product schema alignment.
2. Refactor storefront product pages to Supabase.
3. Refactor cart and checkout to database-backed product data.
4. Lock vendor and order architecture decisions.
5. Start multivendor foundation.
6. Add vendor-aware cart, checkout, and orders.
7. Add vendor dashboard and onboarding experience.

## Suggested Immediate Sprint

If we want the cleanest next sprint, it should be:

1. Build a shared storefront product mapper between database rows and storefront UI types.
2. Refactor `app/products/page.tsx` to read from Supabase.
3. Refactor `app/products/[slug]/page.tsx` to read from Supabase.
4. Remove `mock-products` dependency from cart and checkout where possible.
5. Add a short architecture note for vendor ownership and order structure.

## Practical Rule

If a change still assumes one seller, make it neutral or vendor-ready now.

But do not build the full multivendor workflow until product data and checkout are stable on Supabase.
