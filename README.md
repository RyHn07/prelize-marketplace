# Wholesale Marketplace

## Project Overview

Wholesale Marketplace is a B2B ecommerce platform for sourcing products from China and managing bulk orders for buyers in Bangladesh. The project is built with Next.js, React, TypeScript, Tailwind CSS, and Supabase.

The app is designed to support two sides of the business:

- A customer-facing storefront where buyers can browse products, review details, build a quote/cart, and place orders.
- An admin dashboard where the team can manage products and monitor customer orders.

The next major product direction is evolving this into a multivendor marketplace so multiple sellers can manage their own catalog and fulfill their own orders inside the same platform.

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

The main next step is connecting the public storefront fully to Supabase product data so the admin-managed catalog becomes the single source of truth.

After that, the next major platform upgrade is multivendor support:

- vendor profiles and vendor-owned products
- vendor-aware cart and checkout grouping
- vendor-specific order management
- role-based access for platform admins and vendor users

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

- replacing mock storefront product data with Supabase data
- adding multivendor marketplace support
- completing admin categories, customers, and settings
- improving search, filters, and wishlist features
- documenting database setup, policies, and deployment steps
