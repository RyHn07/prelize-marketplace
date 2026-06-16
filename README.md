# Wholesale Marketplace

## Project Overview

Wholesale Marketplace is a B2B ecommerce platform for sourcing products from China and managing bulk orders for buyers in Bangladesh. The project is built with Next.js, React, TypeScript, Tailwind CSS, and PostgreSQL.

The app is designed to support three sides of the business:

- A customer-facing storefront where buyers can browse products, review details, build a quote/cart, and place orders.
- An admin dashboard where the team can manage products and monitor customer orders.
- A vendor workspace where approved vendors can manage vendor-owned products and review vendor-scoped sub-orders.

The platform has already moved into a multivendor implementation phase, with vendor ownership, vendor memberships, vendor product management, vendor sub-orders, and admin monitoring now present in the codebase.

## Current Status

Last updated: 2026-06-12

The app has moved away from Supabase for normal runtime. Local development now reads live marketplace data from the VPS PostgreSQL database and image assets from the VPS image host.

Current runtime sources:

- Database: VPS PostgreSQL through `process.env.DATABASE_URL`
- Images/storage URLs: `https://img.prelize.com`
- Auth/session: app-owned auth routes with signed cookies and PostgreSQL-backed users
- Admin access: server-side admin layout guard plus `platform_roles`

Supabase files and migrations still exist as historical migration/reference material, but Supabase is not the active backend service for local app runtime.

The project already includes the main commerce flow and a working multivendor foundation:

- Public storefront pages
- Product details and related products
- Login and signup
- Quote/cart flow
- Checkout with buyer information
- Order creation in PostgreSQL
- Customer order history
- Admin dashboard for orders and products
- Vendor dashboard shell and vendor product management
- Vendor-aware order persistence through `vendor_orders`
- Vendor order detail/status management
- Admin monitoring of vendor sub-orders

The safest current work areas are the non-core admin tools and project documentation. The checkout, order creation, and auth flows are already in use and should be treated as stable systems unless a targeted bug requires otherwise.

The current multivendor and operations gaps are now more specific:

- buyer-facing vendor identity on product cards, product details, cart, and customer order history
- stricter vendor-order status rules and parent-order status synchronization
- removal of remaining legacy email-based admin fallback in favor of role-first access
- completion of admin category and customer management tools
- broader QA coverage for multivendor behavior and PostgreSQL-backed admin APIs

For a detailed roadmap, see [PROJECT_PLAN.md](./PROJECT_PLAN.md).

## Core Features

- Product catalog and category browsing
- Product detail pages with specs, description, and reviews
- Quote/cart management with grouped product variations
- Shipping method selection and order summary calculation
- Checkout flow with buyer details
- Customer orders page and order detail page
- Admin order management
- Admin product create and edit flow

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- PostgreSQL via `pg`
- Cookie-based app auth

## Current App Areas

- `app/`: App Router routes for storefront, account, cart, checkout, orders, admin, and vendor areas
- `components/`: shared UI like header, product cards, product forms, and quote helpers
- `lib/`: PostgreSQL access, product queries/actions, vendor logic, media helpers, and shared marketplace access checks
- `types/`: shared TypeScript models for product, vendor, and order-related data
- `postgres/migrations/`: schema history for database changes
- `db/`: PostgreSQL schema/reference archive for the non-Supabase runtime

## What Is Working Today

- Storefront product listing and product detail pages load from VPS PostgreSQL
- Admin product create/edit flows are live
- Customer cart/quote flow is live
- Checkout creates marketplace orders and vendor sub-orders
- Customer order history and order detail pages are live
- Admin orders and vendor orders can be reviewed separately
- Media library reads existing VPS image URLs from PostgreSQL
- Vendor product ownership and vendor membership foundation are in place
- Admin dashboard, products, orders, vendors, customers, categories, brands, reviews, notifications, homepage themes/content/product sections, shipping, and settings now use PostgreSQL-backed admin APIs

## Safe Development Order

To keep production risk low, the current recommended order is:

1. Improve documentation and admin-only tooling first
2. Complete isolated admin sections like categories and customers
3. Polish buyer-facing vendor visibility without changing order logic
4. Return to deeper multivendor/order hardening only after the above is stable

The highest-risk areas remain:

- checkout flow
- order creation and status synchronization
- auth and access control
- VPS database connectivity during build/prerender
- media upload/delete, because the app can read `img.prelize.com` assets but a first-party VPS upload endpoint is not finished yet

Those systems should not be broadly refactored during unrelated work.

## Getting Started

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

Run a production build before pushing:

```bash
npm run build
```

## Environment Notes

- Local environment values are loaded from `.env.local`
- The app expects `DATABASE_URL` to point at the VPS PostgreSQL database
- `.env.example` documents the expected shape without real secrets
- Do not use a local database for normal development unless intentionally creating an isolated copy
- Do not copy image files into `public/storage`; existing image URLs should resolve through `https://img.prelize.com`
- If admin pages show empty data, check the relevant `/api/admin/*` route and VPS database connectivity first

## Current Priorities

The current implementation priority is:

1. Keep the PostgreSQL/VPS runtime documented and stable
2. Finish first-party VPS media upload/delete endpoints
3. Continue removing remaining legacy Supabase-backed code paths
4. Polish vendor display on buyer-facing pages

This order intentionally avoids broad checkout/order rewrites unless a targeted bug requires them.

## Project Direction

The project is moving toward:

- finishing shared product-data alignment between storefront, cart, checkout, and orders
- hardening multivendor marketplace behavior and permissions
- completing remaining admin sections that still have legacy code paths
- improving search, filters, and wishlist features
- documenting PostgreSQL setup, VPS image hosting, and deployment steps
