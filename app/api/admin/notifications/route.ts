import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { requireAdminRequest } from "@/lib/auth/request";
import type { AdminNotificationItem } from "@/lib/admin-notifications";

type NotificationSourceRow = {
  id: string;
  category: AdminNotificationItem["category"];
  title: string;
  body: string;
  href: string;
  occurred_at: string | null;
};

function normalizeTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function getLastReadAt(userId: string) {
  try {
    const result = await query<{ last_read_at: string }>(
      "select last_read_at from public.admin_notification_states where user_id = $1 limit 1",
      [userId],
    );

    return normalizeTimestamp(result.rows[0]?.last_read_at) ?? "1970-01-01T00:00:00.000Z";
  } catch {
    return "1970-01-01T00:00:00.000Z";
  }
}

async function setLastReadAt(userId: string, lastReadAt: string) {
  try {
    await query(
      `
        insert into public.admin_notification_states (user_id, last_read_at, updated_at)
        values ($1, $2, now())
        on conflict (user_id) do update set last_read_at = excluded.last_read_at, updated_at = now()
      `,
      [userId, lastReadAt],
    );
  } catch {
    // Notification read state is optional; listing still works without the table.
  }
}

async function listNotifications(userId: string) {
  const lastReadAt = await getLastReadAt(userId);
  const readBoundary = new Date(lastReadAt).getTime();
  const result = await query<NotificationSourceRow>(
    `
      select *
      from (
        select
          ('order:' || id::text) as id,
          'orders'::text as category,
          ('New order ' || coalesce(order_number, left(id::text, 8))) as title,
          (coalesce(user_email, 'A customer') || ' placed an order with status ' || coalesce(status, 'Order Placed') || '.') as body,
          ('/admin/orders/' || id::text) as href,
          created_at as occurred_at
        from public.orders

        union all

        select
          ('product:' || id::text) as id,
          'products'::text as category,
          'Product updated' as title,
          (coalesce(name, 'Untitled product') || ' is in the catalog.') as body,
          ('/admin/products/' || id::text || '/edit') as href,
          coalesce(updated_at, created_at) as occurred_at
        from public.products

        union all

        select
          ('review:' || reviews.id::text) as id,
          'reviews'::text as category,
          'New product review' as title,
          (coalesce(products.name, 'A product') || ' received ' || coalesce(reviews.rating, 5)::text || '/5 feedback.') as body,
          '/admin/reviews' as href,
          reviews.created_at as occurred_at
        from public.product_reviews reviews
        left join public.products products on products.id = reviews.product_id

        union all

        select
          ('vendor:' || id::text) as id,
          'vendors'::text as category,
          'Vendor updated' as title,
          (coalesce(name, 'Unnamed vendor') || ' is currently ' || coalesce(status, 'pending') || '.') as body,
          ('/admin/vendors/' || id::text || '/edit') as href,
          coalesce(updated_at, created_at) as occurred_at
        from public.vendors

        union all

        select
          ('brand:' || id::text) as id,
          'brands'::text as category,
          'Brand updated' as title,
          (coalesce(name, 'Unnamed brand') || ' was changed in the catalog.') as body,
          '/admin/brands' as href,
          created_at as occurred_at
        from public.brands

        union all

        select
          ('category:' || id::text) as id,
          'categories'::text as category,
          'Category updated' as title,
          (coalesce(name, 'Unnamed category') || ' was changed in the catalog.') as body,
          '/admin/categories' as href,
          created_at as occurred_at
        from public.categories
      ) notifications
      where occurred_at is not null
      order by occurred_at desc
      limit 80
    `,
  );

  const data = result.rows.map<AdminNotificationItem>((row) => {
    const occurredAt = normalizeTimestamp(row.occurred_at) ?? new Date(0).toISOString();

    return {
      id: row.id,
      category: row.category,
      title: row.title,
      body: row.body,
      href: row.href,
      occurredAt,
      isUnread: new Date(occurredAt).getTime() > readBoundary,
    };
  });

  return {
    data: data.slice(0, 24),
    unreadCount: data.filter((item) => item.isUnread).length,
    lastReadAt,
    error: null,
  };
}

export async function GET(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse || !auth.user) {
    return auth.errorResponse;
  }

  try {
    return NextResponse.json(await listNotifications(auth.user.id));
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load notifications.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest(request);

  if (auth.errorResponse || !auth.user) {
    return auth.errorResponse;
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { action?: string; occurredAt?: string };

    if (body.action === "mark_all_read") {
      const lastReadAt = new Date().toISOString();
      await setLastReadAt(auth.user.id, lastReadAt);
      return NextResponse.json({ lastReadAt });
    }

    if (body.action === "mark_read_up_to") {
      const lastReadAt = normalizeTimestamp(body.occurredAt) ?? new Date().toISOString();
      await setLastReadAt(auth.user.id, lastReadAt);
      return NextResponse.json({ lastReadAt });
    }

    {
      return NextResponse.json({ error: "Unsupported notification action." }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update notifications.",
      },
      { status: 500 },
    );
  }
}
