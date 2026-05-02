# Wholesale Marketplace

## Project Overview

Wholesale Marketplace is a B2B ecommerce platform for sourcing products from China and managing bulk orders for buyers in Bangladesh. The project is built with Next.js, React, TypeScript, Tailwind CSS, and Supabase.

The app is designed to support three sides of the business:

- A customer-facing storefront where buyers can browse products, review details, build a quote/cart, and place orders.
- An admin dashboard where the team can manage products and monitor customer orders.
- A vendor workspace where approved vendors can manage vendor-owned products and review vendor-scoped sub-orders.

The platform has already moved into a multivendor implementation phase, with vendor ownership, vendor memberships, vendor product management, vendor sub-orders, and admin monitoring now present in the codebase.

## Current Status

The project already includes the main commerce flow and a working multivendor foundation:

- Public storefront pages
- Product details and related products
- Login and signup
- Quote/cart flow
- Checkout with buyer information
- Order creation in Supabase
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
- broader QA coverage for multivendor and RLS behavior

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
- Supabase

## Current App Areas

- `app/`: App Router routes for storefront, account, cart, checkout, orders, admin, and vendor areas
- `components/`: shared UI like header, product cards, product forms, and quote helpers
- `lib/`: Supabase access, product queries/actions, vendor logic, media helpers, and shared marketplace access checks
- `types/`: shared TypeScript models for product, vendor, and order-related data
- `supabase/migrations/`: schema and RLS changes for platform roles, multivendor support, and order access fixes

## What Is Working Today

- Storefront product listing and product detail pages load from Supabase
- Admin product create/edit flows are live
- Customer cart/quote flow is live
- Checkout creates marketplace orders and vendor sub-orders
- Customer order history and order detail pages are live
- Admin orders and vendor orders can be reviewed separately
- Media library exists for admin product media
- Vendor product ownership and vendor membership foundation are in place

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
- Supabase RLS behavior

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
- The app expects a working Supabase project with the required tables and policies
- Recent multivendor and RLS work lives in `supabase/migrations/`
- If admin, vendor, or media features behave unexpectedly, confirm the latest migrations have been applied

## Current Priorities

The current implementation priority is:

1. Improve `README.md` and project documentation
2. Complete Category CRUD inside the admin area
3. Complete the Customer Management admin page
4. Polish vendor display on buyer-facing pages

This order intentionally avoids touching checkout, orders, and auth until the safer admin/documentation work is complete.

## Project Direction

The project is moving toward:

- finishing shared product-data alignment between storefront, cart, checkout, and orders
- hardening multivendor marketplace behavior and permissions
- completing admin categories, customers, and settings
- improving search, filters, and wishlist features
- documenting database setup, policies, and deployment steps
