# Wholesale Marketplace Project Plan

Last updated: 2026-04-25

## Current Project Snapshot

This plan is based on the current workspace state, not on commit history. Items are marked complete when working code or screens already exist in the repo.

## Project Constitution

This section is the permanent rulebook for the project. Every feature, UI decision, data model, and workflow should follow these principles.

### Core Goal

Build a reliable, scalable wholesale marketplace that supports buyers, platform admins, and future multivendor sellers in one clear system.

### Mission

- Make wholesale buying simple, structured, and trustworthy.
- Build a platform that is easy to use for customers and easy to operate for admins.
- Prepare the architecture for multivendor growth without breaking the core buyer journey.
- Prioritize long-term stability over quick but weak implementations.

### Non-Negotiable Rules

- Always protect the core commerce flow first:
  product browsing, cart, checkout, and order management must remain stable.
- Always prefer real, consistent data models over temporary duplication.
- Always design new features so they can scale to multivendor support.
- Always keep user roles and permissions clear.
- Always choose maintainable solutions over shortcuts that create future rework.
- Always keep the customer journey simple and easy to understand.
- Always keep admin workflows efficient and operationally practical.
- Always keep the UI readable, clean, and commerce-focused.
- Always document major architecture decisions in project files.

### Product Principles

- The storefront must feel trustworthy and easy to use.
- Product information must be clear, structured, and conversion-friendly.
- Cart and checkout must reduce confusion, not add it.
- Orders must be easy for both buyers and admins to understand.
- Multivendor support must feel like a natural platform upgrade, not a broken add-on.

### Technical Principles

- One source of truth for product data.
- One clear access model for each user type.
- Database structure must support future vendor ownership.
- Frontend and backend changes must stay aligned.
- Reusable components should be preferred over repeated custom code.
- Security and access control must be planned, not added at the end.
- Documentation must evolve with implementation.

### Decision Standard

When choosing between two solutions, prefer the one that:

- keeps the buyer flow simpler
- reduces future refactor cost
- supports multivendor architecture
- improves data consistency
- is easier to maintain and document

### Goal Alignment Check

Every major feature should answer these questions before being considered complete:

- Does this help the main marketplace goal?
- Does this keep the buyer journey clear?
- Does this fit future multivendor support?
- Does this avoid creating technical debt we already know about?
- Is access control clear for the users involved?
- Is the behavior documented well enough for future work?

### Project Promise

We are not only building pages and features. We are building a marketplace system with clear rules, clean growth paths, and decisions that keep moving toward the final goal.

## Frontend Theme

### Current Visual Direction

The current frontend theme uses a clean, modern marketplace style focused on clarity, trust, and easy product browsing.

- Light background-first interface
- Neutral slate-based text and border palette
- Strong brand accent color using violet/purple tones like `#615FFF`
- Rounded cards, rounded buttons, and soft component edges
- Clean spacing and simple grid-based layout structure
- Minimal visual clutter so product and order information stay easy to scan

### Theme Characteristics

- Primary background uses very light gray and white surfaces
- Main text uses dark slate tones for readability
- Accent buttons, links, highlights, and focus states use the brand color
- Borders are soft and subtle instead of heavy
- Shadows are used lightly for search bars, cards, and panels
- Typography is currently simple and functional with a basic sans-serif stack

### Frontend Experience Style

- Storefront theme is intended to feel professional, trustworthy, and commerce-focused
- Product pages emphasize readability, pricing, and conversion actions
- Cart and checkout screens focus on structured summaries and low-friction decision making
- Admin pages use a more dashboard-style layout with a darker sidebar and clearer data blocks

### Current Theme Gaps

- Brand identity is still functional but not fully distinctive yet
- Typography is still using a basic Arial/Helvetica stack
- Metadata and branding text still need project-specific polish in some places
- The storefront and admin theme are consistent enough to use, but they can be refined into a stronger design system

### Future Frontend Theme Goals

- Define full brand tokens for color, spacing, radius, and shadows
- Upgrade typography to a stronger branded font system
- Standardize buttons, inputs, cards, badges, and table styles into reusable UI patterns
- Improve visual distinction between customer storefront, admin dashboard, and future vendor dashboard
- Add a more polished responsive design pass across mobile and desktop screens
- Build a more unique marketplace identity once the core product flow is stable

## Types of Users

### 1. Guest User

- Can browse the home page, products, categories, and product details.
- Can search and explore the storefront before creating an account.
- Can review product information and pricing.
- Cannot complete protected actions like checkout or order history without logging in.

### 2. Customer / Buyer

- Can sign up and log in.
- Can browse products and categories.
- Can add items and variations to quote/cart.
- Can manage selected cart items and shipping methods.
- Can complete checkout with buyer details.
- Can view own order history and order details.
- Can manage own account information.

### 3. Platform Admin

- Has access to the marketplace admin dashboard.
- Can manage products across the platform.
- Can review all customer orders.
- Can update order statuses.
- Can manage future category, customer, and settings sections.
- Will likely control vendor approval and marketplace-wide operations once multivendor support is added.

### 4. Vendor / Seller

- This role is planned for the multivendor phase.
- Will manage only vendor-owned products.
- Will view only vendor-relevant orders or sub-orders.
- Will manage vendor profile, catalog, and fulfillment workflow.
- May later include sub-roles such as vendor owner and vendor staff.

## User Flow Details

### Guest User Flow

1. User lands on the home page.
2. User browses categories or products.
3. User opens a product detail page.
4. User reviews pricing, specs, description, and related products.
5. User tries to continue toward cart/checkout.
6. User is prompted to log in or sign up for protected actions.

### Customer / Buyer Flow

1. User signs up or logs in.
2. User browses categories, product lists, and product details.
3. User adds one or more product variations to quote/cart.
4. User opens cart and reviews grouped items.
5. User adjusts quantity, selects items, and chooses shipping methods.
6. User continues to checkout.
7. User enters buyer details such as name, phone, country, city, address, and note.
8. User places the order.
9. Order and order items are saved in Supabase.
10. User is redirected to order details and can later review all orders in the account area.

### Platform Admin Flow

1. Admin logs in with an authorized account.
2. Admin opens the admin dashboard.
3. Admin reviews high-level order status and marketplace activity.
4. Admin opens orders list and order details.
5. Admin updates order status and manages order progress.
6. Admin opens product management.
7. Admin creates, edits, and reviews product records.
8. Admin later manages categories, customers, settings, and vendor approval flows.

### Vendor / Seller Flow

1. Vendor applies or is invited to join the marketplace.
2. Vendor account is reviewed and approved by platform admin.
3. Vendor logs in to a vendor dashboard.
4. Vendor creates and manages own product listings.
5. Vendor receives vendor-specific orders or fulfillment tasks.
6. Vendor updates fulfillment status, shipping progress, and operational notes.
7. Vendor manages vendor profile, contact details, and future payout/reporting features.

### Multivendor Order Flow

1. Buyer adds products from one or more vendors into the cart.
2. Cart groups products by vendor.
3. Buyer reviews vendor-wise shipping, subtotal, and notes.
4. Buyer completes one marketplace checkout.
5. System creates either:
   one parent order with vendor sub-orders, or
   separate vendor-linked orders, depending on final architecture decision.
6. Platform admin can view the full combined order picture.
7. Each vendor can view only the vendor-owned portion of that order.
8. Buyer sees one clear order history experience with vendor-aware breakdown where needed.

## What We Have Done

### 1. Foundation and App Setup

- [x] Next.js app scaffold is in place.
- [x] App Router page structure is set up under `app/`.
- [x] Shared layout and global styling are configured.
- [x] Supabase client integration exists in `lib/supabase-client.ts`.
- [x] Basic TypeScript types and reusable utilities are in place.

### 2. Storefront Experience

- [x] Home page exists.
- [x] Product listing page exists.
- [x] Category listing page exists.
- [x] Product detail page exists.
- [x] Related product section exists on product details.
- [x] Product details tabs exist for specifications, description, and reviews.
- [x] Product purchase panel exists.
- [x] Header navigation/search shell exists.

### 3. Authentication and Account Access

- [x] Login page exists.
- [x] Signup page exists.
- [x] Header auth button exists.
- [x] Account page exists.
- [x] Auth-based route checks are implemented on protected pages like cart, checkout, and orders.

### 4. Quote, Cart, and Checkout Flow

- [x] Quote storage helpers exist.
- [x] Header quote button exists.
- [x] Cart page exists.
- [x] Cart supports grouped products and variation handling.
- [x] Cart supports quantity updates and item removal.
- [x] Cart supports item selection before checkout.
- [x] Cart supports shipping-method selection per product group.
- [x] Cart totals and shipping calculations exist.
- [x] Checkout page exists.
- [x] Checkout collects buyer details.
- [x] Checkout creates orders in Supabase.
- [x] Checkout creates order items in Supabase.
- [x] Checkout clears selected quote/cart items after successful order placement.

### 5. Customer Order Management

- [x] Orders list page exists.
- [x] Order detail page exists.
- [x] Orders are loaded from Supabase for the logged-in customer.
- [x] Order items are grouped for display.
- [x] Basic order print/save support exists on the orders page.

### 6. Admin Area

- [x] Admin layout shell with sidebar/mobile nav exists.
- [x] Admin dashboard page exists.
- [x] Admin orders overview exists.
- [x] Admin order status update flow exists.
- [x] Admin order detail page exists.
- [x] Admin products list page exists.
- [x] Admin add product page exists.
- [x] Admin edit product page exists.
- [x] Product form component exists.
- [x] Product create/update helpers for Supabase exist.

## In Progress or Partially Done

- [x] Admin structure has been started.
- [ ] Admin categories page is only a placeholder.
- [ ] Admin customers page still needs real data and tools.
- [x] Admin settings page now has real persisted settings management.
- [~] Storefront catalog list and detail pages are Supabase-backed, and the buying flow now uses real variant data, but richer detail parity is still incomplete.
- [~] Admin product management is partially connected to the public storefront, and cart/checkout snapshots are stronger, but the data model is not fully finalized yet.
- [ ] Search/filter behavior needs full backend-connected implementation.
- [ ] Wishlist appears started, but the full wishlist user flow is not yet complete.
- [x] README now includes a project overview and current direction.
- [ ] There is no formal testing setup or QA checklist yet.
- [x] A database/schema documentation file now exists in the repo.

## Biggest Current Gap

The app has moved past the old split where the public catalog pages depended mainly on mock products.

The current gap is now more specific:

- public catalog pages use Supabase
- product detail purchasing now uses real variant data, but richer storefront fields are still partly derived
- cart and checkout now use intentional lightweight snapshots, but the snapshot-vs-validation boundary still needs to be finalized

That means the most important next step is aligning product details, quote/cart, and checkout around one stable product data model.

## Multivendor Readiness

The current app is still structured like a single-seller marketplace in several places:

- Products do not have a `vendor_id` or seller ownership field.
- Cart and orders now use neutral marketplace wording, but seller identity is still not data-driven.
- Admin access is global, not vendor-scoped.
- Orders are created as one marketplace order, not split by vendor.
- There is no vendor onboarding, vendor profile, or vendor dashboard flow yet.

Because of this, multivendor support should be treated as a major feature phase, not a small UI update.

## Recommended Next Step

### Next Milestone: Align Product Detail, Cart, and Checkout Data

- [x] Load product list pages from the `products` table.
- [x] Load product detail pages by slug from the `products` table.
- [~] Keep product fields aligned between admin forms, public pages, cart, and checkout.
- [x] Replace hardcoded product detail variant/pricing UI with real product data.
- [ ] Decide how to store or derive product variants, specifications, gallery images, badges, buyer notes, and reviews.
- [x] Add stronger fallback handling for missing or inactive products in the buying flow.
- [~] Confirm admin-created products flow cleanly from storefront to cart to checkout.

## Detailed Roadmap

This roadmap is the execution layer of the project plan. It is meant to help us track exactly what is finished, what is in progress, and what comes next.

### Roadmap Status Labels

- [x] Done
- [ ] Not started
- [~] In progress / partially complete

### Current Overall Status

- [x] Core storefront UI exists
- [x] Authentication screens exist
- [x] Cart and checkout flow exist
- [x] Customer order pages exist
- [x] Admin orders flow exists
- [x] Admin product management has started
- [~] Product data is more strongly aligned between Supabase, storefront UI mapping, and quote/cart snapshots, but the final shared shape is not fully locked
- [~] Admin area is partially complete
- [ ] Multivendor architecture is not implemented yet
- [ ] Formal schema, QA, and release documentation are not complete yet

### Phase A: Foundation Audit and Product Data Alignment

Goal:
Create a stable product data foundation so the storefront, checkout flow, and admin all rely on the same structure.

Success criteria:
- Storefront and admin use aligned product fields
- Product data can support future multivendor ownership
- Mock product dependency is clearly mapped for replacement

Tasks:
- [ ] Audit every field currently used in `data/mock-products.ts`
- [ ] Audit every field currently stored in `types/product-db.ts`
- [ ] Compare storefront needs vs admin form fields
- [ ] List missing fields for public product pages such as gallery, specs, short description, and reviews
- [ ] Decide final product schema for storefront + admin compatibility
- [ ] Decide how variants will be stored
- [ ] Decide how category relationships will be stored
- [ ] Decide how vendor ownership will attach to products in the future
- [ ] Document the agreed product schema in project docs

Deliverables:
- [ ] Final product field map
- [ ] Product schema decision note
- [ ] Clear migration path from mock data to Supabase

### Phase B: Storefront Data Migration

Goal:
Move the public catalog from mock product data to Supabase without breaking browsing or ordering.

Success criteria:
- Public product listing reads from Supabase
- Product details read from Supabase
- Public catalog shows only valid active products

Tasks:
- [x] Build Supabase queries for public product list
- [x] Build Supabase query for product details by slug
- [x] Refactor `app/products/page.tsx` to use database-backed data
- [x] Refactor `app/products/[slug]/page.tsx` to use database-backed data
- [ ] Refactor category browsing to work with real data
- [~] Add loading, empty, and error states for public product pages
- [x] Add fallback handling for inactive or missing products
- [x] Verify related products logic using database-backed category/product relationships

Deliverables:
- [x] Database-backed product listing page
- [x] Database-backed product details page
- [~] Public catalog no longer depends on mock product records for page rendering, and buying data is much closer to real product records, but richer parity cleanup still remains

### Phase C: Cart, Checkout, and Order Data Stabilization

Goal:
Ensure cart, checkout, and order creation continue working after product data is moved to Supabase.

Success criteria:
- Cart still groups items correctly
- Checkout totals remain correct
- Order creation still works end to end

Tasks:
- [x] Identify all current cart dependencies on mock product data
- [x] Replace direct mock lookups in cart flow with real product data
- [x] Replace direct mock lookups in checkout flow with real product data
- [~] Confirm shipping weight and CDD calculations still work with real product records
- [x] Confirm selected product variations work from real variant data instead of placeholder rows
- [~] Verify order summary payload remains correct
- [~] Verify inserted order items match storefront product data
- [~] Test successful order placement from catalog to order details page
- [x] Remove hardcoded seller wording and placeholder buying assumptions

Deliverables:
- [ ] Cart flow works with database-backed products
- [ ] Checkout flow works with database-backed products
- [ ] Order creation verified after data migration

### Phase D: Admin Catalog Completion

Goal:
Turn the admin area into a complete catalog management system instead of a partial product editor.

Success criteria:
- Admin can manage products cleanly
- Categories are no longer placeholders
- Product lifecycle is more complete

Tasks:
- [x] Admin product list page exists
- [x] Admin create product page exists
- [x] Admin edit product page exists
- [ ] Add product archive/deactivate flow
- [ ] Add product delete strategy or soft-delete policy
- [ ] Add category create/read/update/delete flow
- [ ] Connect category selection to product management
- [ ] Improve product validation and error handling
- [ ] Add product status and publish visibility controls
- [ ] Add media/gallery management approach

Deliverables:
- [ ] Full category management
- [ ] Complete product lifecycle controls
- [ ] Cleaner admin catalog workflow

### Phase E: Admin Operations Completion

Goal:
Finish the operational dashboard so platform admins can run the marketplace day to day.

Success criteria:
- Orders, customers, settings, and admin permissions are clearly managed

Tasks:
- [x] Admin orders overview exists
- [x] Admin order detail exists
- [x] Admin order status update flow exists
- [ ] Improve internal notes and order operations workflow
- [ ] Build real customer management page
- [x] Build real admin settings page
- [~] Replace simple email-based admin gate with role-based authorization
- [ ] Define platform admin permissions clearly

Deliverables:
- [ ] Customer management screen
- [x] Settings management screen
- [ ] Role-based platform admin control

### Phase F: Multivendor Foundation

Goal:
Prepare the platform to support multiple sellers with clear ownership, access, and order boundaries.

Success criteria:
- Products belong to vendors
- Vendor users only see their own data
- Order structure supports vendor participation cleanly

Tasks:
- [ ] Create `vendors` table
- [ ] Define vendor profile fields
- [ ] Add `vendor_id` to `products`
- [ ] Decide vendor membership model for owner/staff access
- [ ] Add vendor roles and permission strategy
- [ ] Define vendor approval workflow
- [ ] Define vendor status model such as pending, active, suspended
- [ ] Replace hardcoded seller labels in cart and order views
- [ ] Show vendor information on public product pages
- [ ] Decide final multivendor order structure

Deliverables:
- [ ] Vendor data model
- [ ] Vendor-aware product ownership
- [ ] Vendor permission strategy
- [ ] Vendor-ready order architecture decision

### Phase G: Multivendor Cart, Checkout, and Orders

Goal:
Support buyer purchases across multiple vendors while keeping the experience understandable.

Success criteria:
- Cart can contain items from multiple vendors
- Vendor grouping is clear
- Buyer, admin, and vendor each see the right level of order detail

Tasks:
- [ ] Group cart items by vendor
- [ ] Show vendor-level subtotal blocks
- [ ] Show vendor-level shipping and notes if needed
- [ ] Update checkout payload to support vendor-aware order creation
- [ ] Create parent order and vendor sub-order model, or finalize separate vendor-linked orders
- [ ] Update customer order history to show vendor-aware structure cleanly
- [ ] Create vendor order view for vendor-side operations
- [ ] Keep platform admin visibility across all vendor-linked order data

Deliverables:
- [ ] Multivendor cart UI
- [ ] Multivendor checkout structure
- [ ] Vendor-aware order history and operations flow

### Phase H: Vendor Experience

Goal:
Provide vendors with a usable seller-side workspace and profile presence.

Success criteria:
- Vendors can manage their storefront identity and product operations

Tasks:
- [ ] Create vendor onboarding flow
- [ ] Create vendor dashboard shell
- [ ] Create vendor product management flow
- [ ] Create vendor order management flow
- [ ] Create vendor profile/storefront page
- [ ] Create vendor settings/business profile page
- [ ] Add vendor metrics and summary cards

Deliverables:
- [ ] Vendor dashboard
- [ ] Vendor storefront/profile
- [ ] Vendor product and order operations

### Phase I: Customer Experience Improvements

Goal:
Improve usability, trust, and conversion quality for buyers.

Success criteria:
- Browsing and checkout feel smoother and more complete

Tasks:
- [~] Wishlist utilities started
- [ ] Complete wishlist user flow
- [ ] Improve search behavior
- [ ] Improve product filters
- [ ] Add vendor-based filtering
- [ ] Improve account page usefulness
- [ ] Improve empty states across customer flows
- [ ] Improve mobile polish for storefront, cart, checkout, and orders
- [ ] Add order confirmation and customer communication improvements

Deliverables:
- [ ] Better buyer discovery tools
- [ ] Better buyer retention tools
- [ ] Stronger mobile experience

### Phase J: Security, Data Quality, and Documentation

Goal:
Make the system safer, more maintainable, and easier to operate.

Success criteria:
- Roles are enforced properly
- Data structures are documented
- Team can onboard and maintain the system more easily

Tasks:
- [x] Add schema documentation
- [ ] Add migration/setup documentation
- [ ] Review RLS and access rules for each table
- [ ] Add vendor-specific RLS rules
- [ ] Add validation rules for product forms
- [ ] Add validation rules for checkout payloads
- [ ] Replace starter metadata and branding leftovers
- [ ] Expand README setup instructions
- [ ] Add QA checklist for storefront, cart, checkout, admin, and multivendor permissions

Deliverables:
- [ ] Schema/setup documentation
- [ ] Permission review checklist
- [ ] QA and release checklist

## What Is Already Done vs What Is Next

### Completed Milestones

- [x] Base Next.js app created
- [x] Storefront pages created
- [x] Authentication pages created
- [x] Quote/cart flow created
- [x] Checkout flow created
- [x] Customer order pages created
- [x] Admin layout created
- [x] Admin orders flow created
- [x] Admin product create/edit flow started
- [x] Project plan documentation created
- [x] README project overview added
- [x] Database schema blueprint added

### Current Active Work Area

- [~] Aligning product detail, cart, and checkout data around the real Supabase product source
- [~] Expanding the project plan into a full product and architecture guide
- [~] Preparing the structure for multivendor support

### Highest-Priority Next Steps

- [ ] Finalize product schema
- [x] Replace placeholder product detail buying data with real variant/product data
- [~] Refactor cart and checkout from lightweight snapshots to intentional product snapshots plus validation
- [~] Replace email-based admin access with role-based access
- [ ] Define vendor and multivendor order architecture

## Tracking Board

### Now

- [~] Final product schema audit
- [x] Product detail buying-data refactor
- [x] Cart/checkout dependency cleanup

### Next

- [ ] Category CRUD
- [ ] Customer admin page
- [x] Admin settings page
- [ ] Role-based admin authorization

### Later

- [ ] Vendor tables and vendor roles
- [ ] Multivendor cart and checkout
- [ ] Vendor dashboard
- [ ] Vendor storefront pages
- [ ] Payout and reporting model

### Finalization

- [x] Schema docs
- [ ] QA checklist
- [ ] Deployment/setup guide
- [ ] Release readiness review

## Full Project Plan

### Phase 1: Stabilize Core Commerce Flow

- [x] Product browsing
- [x] Product details
- [x] Quote/cart flow
- [x] Checkout form
- [x] Order creation
- [x] Customer order history
- [~] Remove remaining dependence on mock data
- [ ] Validate all order and cart totals against real product records

### Phase 2: Complete Catalog Management

- [x] Admin product list
- [x] Admin product create/edit screens
- [ ] Product delete or archive flow
- [ ] Category CRUD
- [ ] Product/category relationship management
- [ ] Product media/gallery management
- [ ] Product status and publish controls
- [ ] Slug uniqueness and validation rules
- [ ] Attach every product to a vendor/seller record

### Phase 3: Complete Admin Operations

- [x] Admin order overview
- [x] Admin order status updates
- [x] Admin order detail page
- [ ] Internal order notes workflow refinement
- [ ] Customer management screen with real Supabase data
- [ ] Admin settings with real persistence
- [ ] Admin access policy hardening beyond client-side email checks

### Phase 4: Add Multivendor Foundation

- [ ] Create vendor table and vendor profile model
- [ ] Link products to vendors with `vendor_id`
- [ ] Add vendor-owned admin permissions and policies
- [ ] Add vendor dashboard shell separate from marketplace admin
- [ ] Show vendor/seller info on public product pages
- [ ] Replace hardcoded seller labels in cart and orders with real vendor data
- [ ] Define whether checkout creates one parent order with vendor sub-orders or separate orders per vendor
- [ ] Split cart totals and fulfillment logic by vendor
- [ ] Store vendor-specific shipping, notes, and payout data
- [ ] Add vendor status workflow such as pending approval, active, suspended

### Phase 5: Improve Customer Experience

- [x] Auth pages
- [x] Account page
- [x] Orders pages
- [ ] Wishlist full implementation
- [ ] Better catalog filtering and search
- [ ] Vendor storefront pages or seller profile pages
- [ ] Filter products by vendor or supplier
- [ ] Better empty states and error states
- [ ] Mobile polish across all key flows
- [ ] Customer notifications or order confirmation messaging

### Phase 6: Data and Backend Hardening

- [x] Supabase client usage started
- [x] Orders and order items persistence started
- [x] Product table usage started in admin
- [x] Add schema documentation
- [ ] Add row-level security review for all tables
- [ ] Validate insert/update permissions for admin-only actions
- [ ] Add row-level security for vendor-owned data
- [ ] Add vendor payout/reporting data model
- [ ] Add input validation for product forms and checkout payloads
- [ ] Add migration notes for required columns and tables

### Phase 7: Quality, Documentation, and Release Readiness

- [x] Replace starter README with real project documentation
- [x] Create a project plan file
- [ ] Add lint/build verification checklist
- [ ] Add test strategy for utilities and critical flows
- [ ] Add multivendor QA checklist for vendor/product/order permissions
- [ ] Add manual QA checklist for auth, cart, checkout, and admin
- [ ] Prepare deployment/environment setup guide

## Multivendor Implementation Plan

### Step 1: Data Model

- [ ] Create `vendors` table
- [ ] Add `vendor_id` to `products`
- [ ] Decide whether categories are global or vendor-specific
- [ ] Add vendor fields such as name, slug, logo, banner, description, contact email, phone, address, and status
- [ ] Add vendor membership or role table if one vendor can have multiple staff users

### Step 2: Access Control

- [~] Replace simple admin email check with role-based access
- [ ] Support platform admin role
- [ ] Support vendor owner/staff role
- [ ] Restrict vendor users to only their own products and orders

### Step 3: Vendor Product Management

- [ ] Vendor can create products
- [ ] Vendor can edit only own products
- [ ] Vendor can view only own product list
- [ ] Platform admin can view all vendor products
- [ ] Add vendor name to product cards/details/cart/order history

### Step 4: Multivendor Cart and Checkout

- [ ] Allow cart to contain products from multiple vendors
- [ ] Group cart items by vendor
- [ ] Show vendor-level subtotal, shipping, and notes
- [ ] Decide commission, fee, and payout rules
- [ ] Create vendor-aware order structure in database

### Step 5: Vendor Orders and Fulfillment

- [ ] Vendor sees only orders containing own products
- [ ] Vendor can update fulfillment status for own items or sub-orders
- [ ] Platform admin keeps full cross-vendor visibility
- [ ] Customer can still see one clear order history experience

### Step 6: Vendor Experience

- [ ] Vendor onboarding flow
- [ ] Vendor profile/storefront page
- [ ] Vendor dashboard metrics
- [ ] Vendor settings and business profile management

## Suggested Execution Order

1. Connect public product pages to Supabase so admin-managed products power the storefront.
2. Finalize product schema so it can support vendor ownership cleanly.
3. Add multivendor database foundation and vendor-aware permissions.
4. Refactor cart, checkout, and orders to use real vendor data.
5. Finish category, customer, and vendor dashboards.
6. Add documentation, testing, and release-readiness checks.

## Immediate Action List

- [ ] Audit current product fields used by `mock-products` vs `products` table.
- [ ] Define final product schema for gallery, specs, description, badge, reviews, and variants.
- [ ] Extend the schema design for vendor ownership and vendor roles.
- [x] Refactor public catalog pages to read from Supabase.
- [x] Refactor product detail purchase flow to use real variant data.
- [~] Remove hardcoded seller labels and replace them with vendor data.
- [~] Refactor cart/checkout dependencies that still assume mock product records.
- [~] Update README with real setup instructions.
- [x] Add a separate schema or setup document for Supabase tables and policies.

## Definition of Done for the Next Milestone

- [x] Public product list uses Supabase data.
- [x] Public product detail uses Supabase data.
- [~] Cart and checkout still work after removing mock dependency, including unavailable-item blocking.
- [ ] Admin-created product appears correctly on the storefront.
- [ ] Inactive product does not appear publicly.
- [x] Lint/build verification passes after the latest refactor.
