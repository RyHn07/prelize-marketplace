# Wholesale Marketplace Database Schema

Last updated: 2026-04-25

## Purpose

This document describes:

- the current database structure already expected by the app
- the missing fields and tables still needed for a complete catalog
- the recommended future schema for multivendor support

This is a working implementation guide, not a final migration history.

## Current Tables Used by the App

### 1. `products`

This table is already used by the admin product pages.

Current fields inferred from the code:

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | uuid or text | Yes | Primary key |
| `category_id` | uuid or text nullable | No | Currently optional |
| `name` | text | Yes | Product name |
| `slug` | text | Yes | Used for public product URLs |
| `description` | text nullable | No | Long description |
| `image_url` | text nullable | No | Main product image |
| `price` | numeric | Yes | Base/unit price |
| `moq` | integer or numeric | Yes | Minimum order quantity |
| `weight` | text or numeric nullable | No | Used by shipping calculation |
| `badge` | text nullable | No | Example: `Hot`, `New`, `Best Value` |
| `is_active` | boolean | Yes | Controls visibility/readiness |
| `created_at` | timestamp | Yes | Creation timestamp |

Current gaps:

- No vendor ownership field yet
- No gallery field yet
- No specifications field yet
- No short description field yet
- No reviews field yet
- No variant storage yet

### 2. `orders`

This table is used by checkout, customer orders, and admin orders.

Current fields inferred from the code:

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | uuid or text | Yes | Primary key |
| `order_number` | text | Yes | Public order identifier like `PLZ-...` |
| `user_id` | uuid or text | Yes | Customer user id |
| `user_email` | text | Yes | Customer email |
| `status` | text | Yes | Example: `Pending`, `Confirmed`, `Processing`, `Shipped`, `Delivered`, `Cancelled` |
| `payment_method` | text nullable | No | Currently expected by the app |
| `payment_status` | text nullable | No | Currently expected by the app |
| `buyer` | jsonb nullable | No | Buyer info object |
| `summary` | jsonb | Yes | Pricing and quantity summary |
| `shipping_methods` | jsonb nullable | No | Selected shipping methods per product group |
| `admin_note` | text nullable | No | Admin internal note |
| `created_at` | timestamp | Yes | Creation timestamp |

Expected `buyer` JSON shape:

```json
{
  "fullName": "Customer Name",
  "phone": "01700000000",
  "country": "Bangladesh",
  "city": "Dhaka",
  "address": "Street address",
  "note": "Optional note"
}
```

Expected `summary` JSON shape:

```json
{
  "quantity": 12,
  "totalQuantity": 12,
  "productPrice": 15000,
  "cddCharge": 120,
  "shippingCost": 3000,
  "hasUnknownShipping": false,
  "payNow": 15120,
  "payOnDelivery": 3000
}
```

Expected `shipping_methods` JSON shape:

```json
[
  {
    "productId": "product-id",
    "productName": "Product Name",
    "shippingProfileId": "air",
    "shippingProfileName": "By Air"
  }
]
```

### 3. `order_items`

This table stores the actual purchased rows linked to an order.

Current fields inferred from the code:

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | uuid or text | Yes | Primary key |
| `order_id` | uuid or text | Yes | References `orders.id` |
| `product_id` | uuid or text | Yes | Product id at purchase time |
| `product_name` | text | Yes | Snapshot of product name |
| `product_image` | text nullable | No | Snapshot of product image |
| `variation` | text | Yes | Selected variation label |
| `price` | numeric | Yes | Snapshot of unit price |
| `quantity` | integer | Yes | Purchased quantity |
| `weight` | numeric nullable | No | Snapshot of item weight |

## Recommended Near-Term Tables

### 4. `categories`

This table should be added or formalized so product/category relationships become real.

Recommended fields:

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | uuid | Yes | Primary key |
| `name` | text | Yes | Category name |
| `slug` | text | Yes | Public URL segment |
| `image_url` | text nullable | No | Optional category image |
| `description` | text nullable | No | Optional description |
| `is_active` | boolean | Yes | Controls visibility |
| `sort_order` | integer nullable | No | Optional display order |
| `created_at` | timestamp | Yes | Creation timestamp |

### 5. `product_variants`

The current app treats variation as a text label stored in local/cart/order state. That should become a first-class table.

Recommended fields:

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | uuid | Yes | Primary key |
| `product_id` | uuid | Yes | References `products.id` |
| `name` | text | Yes | Variant label |
| `sku` | text nullable | No | Optional stock code |
| `price` | numeric nullable | No | Optional override price |
| `weight` | numeric nullable | No | Optional override weight |
| `image_url` | text nullable | No | Optional variant image |
| `min_order_quantity` | integer nullable | No | Optional override MOQ |
| `is_active` | boolean | Yes | Whether this variant can be ordered |
| `sort_order` | integer nullable | No | Optional UI ordering |
| `created_at` | timestamp | Yes | Creation timestamp |

### 6. `product_media`

Recommended for gallery support.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | uuid | Yes | Primary key |
| `product_id` | uuid | Yes | References `products.id` |
| `image_url` | text | Yes | Media URL |
| `alt_text` | text nullable | No | Accessibility text |
| `sort_order` | integer nullable | No | Display ordering |
| `created_at` | timestamp | Yes | Creation timestamp |

### 7. `product_specifications`

Recommended for structured product specs.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | uuid | Yes | Primary key |
| `product_id` | uuid | Yes | References `products.id` |
| `label` | text | Yes | Example: `Material` |
| `value` | text | Yes | Example: `PU Leather` |
| `sort_order` | integer nullable | No | Display ordering |

## Recommended Product Schema Upgrade

To support the current storefront properly, `products` should eventually include or be paired with data for:

- `short_description`
- `vendor_id`
- related `product_media`
- related `product_specifications`
- related `product_variants`
- optional `meta_title`
- optional `meta_description`

Recommended upgraded `products` fields:

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | uuid | Yes | Primary key |
| `vendor_id` | uuid nullable at first | No | Required once multivendor starts |
| `category_id` | uuid nullable | No | References categories |
| `name` | text | Yes | Product name |
| `slug` | text unique | Yes | Public URL slug |
| `short_description` | text nullable | No | Card/list summary |
| `description` | text nullable | No | Main long description |
| `image_url` | text nullable | No | Main image |
| `price` | numeric | Yes | Base price |
| `moq` | integer | Yes | Minimum order quantity |
| `weight` | numeric nullable | No | Default weight |
| `badge` | text nullable | No | Marketing tag |
| `is_active` | boolean | Yes | Publish visibility |
| `created_at` | timestamp | Yes | Creation time |
| `updated_at` | timestamp | Yes | Update time |

## Multivendor Schema Recommendation

### 1. `vendors`

This is the main seller/business entity.

Recommended fields:

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | uuid | Yes | Primary key |
| `name` | text | Yes | Vendor/business name |
| `slug` | text unique | Yes | Public vendor URL |
| `logo_url` | text nullable | No | Brand image |
| `banner_url` | text nullable | No | Storefront banner |
| `description` | text nullable | No | About seller |
| `contact_email` | text nullable | No | Contact email |
| `contact_phone` | text nullable | No | Contact phone |
| `address` | text nullable | No | Business address |
| `status` | text | Yes | Example: `pending`, `active`, `suspended` |
| `created_at` | timestamp | Yes | Creation timestamp |
| `updated_at` | timestamp | Yes | Update timestamp |

### 2. `vendor_members`

This maps authenticated users to vendors and roles.

Recommended fields:

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | uuid | Yes | Primary key |
| `vendor_id` | uuid | Yes | References `vendors.id` |
| `user_id` | uuid | Yes | Supabase auth user id |
| `role` | text | Yes | Example: `owner`, `staff` |
| `status` | text | Yes | Example: `active`, `invited`, `disabled` |
| `created_at` | timestamp | Yes | Creation timestamp |

### 3. `platform_roles`

Recommended if platform admins are no longer hardcoded by email.

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | uuid | Yes | Primary key |
| `user_id` | uuid | Yes | Supabase auth user id |
| `role` | text | Yes | Example: `platform_admin` |
| `created_at` | timestamp | Yes | Creation timestamp |

## Multivendor Order Model Recommendation

The cleanest long-term model is:

- one parent marketplace order
- one or more vendor sub-orders beneath it
- item rows linked to the correct vendor order

Recommended extra tables:

### 1. `vendor_orders`

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | uuid | Yes | Primary key |
| `order_id` | uuid | Yes | References parent `orders.id` |
| `vendor_id` | uuid | Yes | References `vendors.id` |
| `status` | text | Yes | Vendor fulfillment status |
| `summary` | jsonb | Yes | Vendor-level totals |
| `shipping_method` | jsonb nullable | No | Vendor shipping selection |
| `vendor_note` | text nullable | No | Vendor-side note |
| `admin_note` | text nullable | No | Platform note for vendor order |
| `created_at` | timestamp | Yes | Creation timestamp |

### 2. `vendor_order_items`

Alternative:

- keep one `order_items` table and add `vendor_id` + `vendor_order_id`

Recommended upgrade if reusing `order_items`:

| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| `vendor_id` | uuid | Yes | Item owner vendor |
| `vendor_order_id` | uuid | No at migration start | Links to vendor sub-order |

## Access Control Direction

Recommended access rules:

- Customers can read only their own `orders` and `order_items`
- Platform admins can read and update all marketplace orders/products/categories/vendors
- Vendor users can read and update only vendor-owned products and vendor-owned order records
- Public users can read only active/public products and categories

## Immediate Schema Tasks

- [ ] Formalize `categories` table
- [ ] Decide final `products` schema beyond current admin fields
- [ ] Add `updated_at` to mutable tables
- [ ] Decide `product_variants` structure
- [ ] Decide whether reviews are stored internally or mocked temporarily
- [ ] Replace hardcoded admin email access with role tables
- [ ] Add `vendors` and `vendor_members` when multivendor implementation begins

## Notes for Current Implementation

Important current assumptions in code:

- Public storefront still relies heavily on `mock-products`
- Cart and checkout still read product weight/CDD details from mock data
- Seller labels in customer order pages are hardcoded
- The app already expects `payment_method`, `payment_status`, and `admin_note` to exist or be added to `orders`

Because of that, the next implementation step should be:

1. finalize the real product schema
2. connect public catalog pages to Supabase
3. refactor cart/checkout away from mock product lookups
4. then add vendor ownership on top of the stable schema
