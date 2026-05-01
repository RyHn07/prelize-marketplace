# Wholesale Marketplace

## Project Overview

Wholesale Marketplace is a B2B ecommerce platform for sourcing products from China and managing bulk orders for buyers in Bangladesh. The project is built with Next.js, React, TypeScript, Tailwind CSS, and Supabase.

The app is designed to support three sides of the business:

- A customer-facing storefront where buyers can browse products, review details, build a quote/cart, and place orders.
- An admin dashboard where the team can manage products and monitor customer orders.
- A vendor workspace where approved vendors can manage vendor-owned products and review vendor-scoped sub-orders.

The platform has already moved into a multivendor implementation phase, with vendor ownership, vendor memberships, vendor product management, vendor sub-orders, and admin monitoring now present in the codebase.

## Current Status

The project already includes the main commerce flow:

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

The main next step is hardening multivendor correctness and exposing vendor identity more clearly in buyer-facing surfaces so the admin-managed catalog and vendor order architecture feel like one consistent system.

The current multivendor gaps are now more specific:

- buyer-facing vendor identity on product cards, product details, cart, and customer order history
- stricter vendor-order status rules and parent-order status synchronization
- removal of remaining legacy email-based admin fallback in favor of role-first access
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

## Getting Started

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Project Direction

The project is moving toward:

- finishing shared product-data alignment between storefront, cart, checkout, and orders
- hardening multivendor marketplace behavior and permissions
- completing admin categories, customers, and settings
- improving search, filters, and wishlist features
- documenting database setup, policies, and deployment steps
