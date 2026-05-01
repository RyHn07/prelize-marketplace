# Current Execution Plan

Last updated: 2026-05-02

## Purpose

This file turns the broader project roadmap into a practical execution order for the current repo state.

It answers:

- what we should do now
- what still must be hardened now that multivendor has started
- where the next multivendor implementation slice should focus

## Current Reality

The project already has:

- storefront UI
- auth screens
- cart and checkout flow
- customer orders pages
- admin product flow
- admin order flow
- persisted admin settings page
- Supabase-backed product management
- Supabase-backed public product list and product detail pages
- multivendor schema migration for vendors, vendor members, vendor orders, and product ownership
- multivendor RLS migration plus recursion-safe platform admin helper
- vendor management screens in admin
- vendor-scoped product management screens in a separate vendor workspace
- checkout creation of parent `orders` plus vendor-scoped `vendor_orders`
- vendor order list and vendor order detail pages
- admin order-detail monitoring of vendor sub-orders

The biggest current gap is now multivendor hardening and buyer-facing vendor visibility, not the basic multivendor foundation itself.

Because of that, the platform is past multivendor setup and into stabilization work.

## Decision

We should treat multivendor foundation as already in progress and focus the next implementation phases on:

- finishing product and access-model hardening
- hardening vendor-aware order correctness and status behavior
- exposing vendor identity in buyer-facing surfaces

## What We Do Now

### Priority 1: Finish product data alignment around the Supabase catalog

This is the current top priority.

Tasks:

- [x] Public product list reads from Supabase
- [x] Public product details page reads from Supabase
- [x] Admin-created products can power the public catalog path
- [x] Audit current product shapes and gaps in `PRODUCT_DATA_AUDIT.md`
- [ ] Audit field usage in `types/product.ts`
- [ ] Audit field usage in `types/product-db.ts`
- [ ] Define one shared product shape for storefront, admin, cart, and orders
- [ ] Confirm which storefront fields come directly from `products`
- [ ] Confirm which fields need separate tables such as variants, media, specifications, and reviews
- [x] Refactor product detail purchase flow to use real variant and pricing data
- [ ] Document missing fields still needed for full storefront parity

Definition of done:

- Product detail purchasing no longer relies on hardcoded variant rows
- Storefront product fields are intentionally mapped from real data
- Product data no longer depends on placeholder storefront assumptions for key buying actions

### Priority 2: Stabilize cart and checkout around real product data

The cart and checkout already enrich quote items with live product records, but they still rely on client-side snapshots for key purchase data.

Tasks:

- [x] Remove direct mock-product lookups from cart and checkout
- [x] Load product weight and display metadata from real product records where available
- [~] Decide which fields must be stored as stable quote snapshots vs revalidated from the database
- [~] Ensure order creation stores a stable snapshot of purchased product data
- [x] Verify inactive or deleted products do not break existing cart/order flows
- [x] Replace single-seller assumptions with neutral wording in the customer flow
- [x] Remove hardcoded seller labels from cart UI

Definition of done:

- Cart totals and shipping work from database-backed product data
- Checkout creates orders using stable product snapshots
- No critical cart or checkout logic depends on placeholder storefront assumptions

### Priority 3: Finish the schema and access decisions that the current multivendor phase depends on

Before building vendor-aware orders and storefront exposure, we should lock the remaining data model decisions.

Tasks:

- [ ] Finalize product schema for gallery, specs, variants, and short description
- [x] Decide how `vendor_id` will attach to products
- [ ] Decide whether categories are global or vendor-specific
- [x] Define `vendors` table fields
- [x] Define `vendor_members` table for owner/staff access
- [~] Decide the multivendor order model

Decision needed:

- parent marketplace order plus vendor sub-orders
- or separate vendor-linked orders

Recommendation:

Use one parent marketplace order with vendor sub-orders. It keeps the buyer experience cleaner while still giving vendors scoped fulfillment views.

## Current Multivendor Gate

The foundation is already live. The current multivendor hardening phase should keep these true:

- [x] Storefront products are fully Supabase-backed
- [~] Cart and checkout do not rely on mock product data
- [x] Product schema is stable enough to add `vendor_id`
- [~] Admin access direction is clear enough to support role-based permissions

If those items drift, multivendor order work will create rework.

## Current Multivendor Phase

The current repo is already inside the first implementation phase.

### Phase 1: Multivendor Foundation

- [x] Create `vendors` table
- [x] Create `vendor_members` table
- [x] Add nullable `vendor_id` to `products`
- [~] Backfill or assign products to vendor records
- [x] Define vendor statuses such as `pending`, `active`, and `suspended`
- [~] Replace hardcoded seller labels with real vendor data
- [ ] Show vendor name on product cards, product details, cart, and orders
- [~] Add role-based permission rules for platform admins and vendor users

Definition of done:

- [x] Every product can belong to a vendor
- [x] Vendor identity exists in the data model
- [ ] Seller labels in the UI come from real data
- [~] Permissions can be scoped by vendor

### Phase 2: Vendor-Aware Orders

- [x] Add vendor-aware order structure
- [x] Group checkout items by vendor during order creation
- [x] Add vendor-level shipping and note support to `vendor_orders`
- [x] Create vendor-specific order views
- [x] Keep platform admin visibility across all orders
- [ ] Keep customer order history simple and understandable with vendor-aware breakdowns

### Phase 3: Vendor Experience

- [x] Vendor dashboard shell
- [x] Vendor product management
- [~] Vendor order management
- [ ] Vendor onboarding and approval flow
- [ ] Vendor profile/storefront page
- [~] Vendor categories, media, and shop-settings shells

## Recommended Working Order

1. Finish product schema alignment.
2. Stabilize cart and checkout around database-backed product snapshots.
3. Finish role-based access hardening beyond legacy email fallback.
4. Harden vendor-order status rules and parent-order status sync.
5. Expose vendor-aware structure in customer order views and storefront surfaces.
6. Expose vendor identity on storefront product surfaces.
7. Finish the remaining vendor workspace pages and onboarding flow.

## Suggested Immediate Sprint

If we want the cleanest next sprint, it should be:

1. Decide the richer storefront detail schema for specs, buyer notes, and reviews.
2. Lock the shared buying-data shape used by quote items, order items, and storefront detail pages.
3. Finish replacing simple admin email fallback with role-first authorization.
4. Harden vendor order status transitions, parent order status sync, and buyer-facing vendor order visibility.
5. Start the next admin completion slice after settings and vendors: categories or customers.

## Practical Rule

If a change still assumes one seller, make it neutral or vendor-ready now.

But do not expand multivendor UI breadth further until product data, checkout, and permissions stay stable on Supabase.
