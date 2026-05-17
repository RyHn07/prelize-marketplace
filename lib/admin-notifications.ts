import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminNotificationItem = {
  id: string;
  category:
    | "orders"
    | "products"
    | "vendors"
    | "brands"
    | "categories"
    | "homepage"
    | "settings";
  title: string;
  body: string;
  href: string;
  occurredAt: string;
  isUnread: boolean;
};

type NotificationSourceRow = {
  id: string;
  title: string;
  body: string;
  href: string;
  occurredAt: string | null | undefined;
  category: AdminNotificationItem["category"];
};

type AdminNotificationStateRow = {
  user_id: string;
  last_read_at: string;
  created_at: string;
  updated_at: string;
};

function normalizeTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function sortNotificationsByDate(left: NotificationSourceRow, right: NotificationSourceRow) {
  return new Date(right.occurredAt ?? 0).getTime() - new Date(left.occurredAt ?? 0).getTime();
}

function mapRowsToNotifications(rows: NotificationSourceRow[], lastReadAt: string) {
  const readBoundary = new Date(lastReadAt).getTime();

  return rows
    .filter((row) => normalizeTimestamp(row.occurredAt))
    .sort(sortNotificationsByDate)
    .map(
      (row): AdminNotificationItem => ({
        id: row.id,
        category: row.category,
        title: row.title,
        body: row.body,
        href: row.href,
        occurredAt: normalizeTimestamp(row.occurredAt)!,
        isUnread: new Date(row.occurredAt ?? 0).getTime() > readBoundary,
      }),
    );
}

async function getAdminNotificationState(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("admin_notification_states")
    .select("user_id, last_read_at, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return {
      data: {
        user_id: userId,
        last_read_at: "1970-01-01T00:00:00.000Z",
        created_at: "1970-01-01T00:00:00.000Z",
        updated_at: "1970-01-01T00:00:00.000Z",
      } satisfies AdminNotificationStateRow,
      error,
    };
  }

  return {
    data: data as AdminNotificationStateRow,
    error: null,
  };
}

async function getOrderNotifications(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, user_email, status, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  return ((data ?? []) as Array<{
    id: string;
    order_number: string | null;
    user_email: string | null;
    status: string | null;
    created_at: string | null;
  }>).map(
    (row): NotificationSourceRow => ({
      id: `order:${row.id}`,
      category: "orders",
      title: `New order ${row.order_number?.trim() || row.id.slice(0, 8)}`,
      body: `${row.user_email?.trim() || "A customer"} placed an order with status ${row.status?.trim() || "Pending"}.`,
      href: `/admin/orders/${row.id}`,
      occurredAt: row.created_at,
    }),
  );
}

async function getProductNotifications(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("products")
    .select("id, name, status, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(8);

  return ((data ?? []) as Array<{
    id: string;
    name: string | null;
    status: string | null;
    created_at: string | null;
    updated_at: string | null;
  }>).map((row) => {
    const createdAt = new Date(row.created_at ?? 0).getTime();
    const updatedAt = new Date(row.updated_at ?? 0).getTime();
    const wasUpdated = Number.isFinite(createdAt) && Number.isFinite(updatedAt) && updatedAt - createdAt > 60_000;

    return {
      id: `product:${row.id}:${wasUpdated ? "updated" : "created"}`,
      category: "products" as const,
      title: wasUpdated ? "Product updated" : "Product added",
      body: `${row.name?.trim() || "Untitled product"} is now ${row.status?.trim() || "draft"} in the catalog.`,
      href: `/admin/products/${row.id}/edit`,
      occurredAt: wasUpdated ? row.updated_at : row.created_at,
    } satisfies NotificationSourceRow;
  });
}

async function getVendorNotifications(supabase: SupabaseClient) {
  const [vendorsResult, invitationsResult] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, name, status, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("vendor_invitations")
      .select("user_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const vendorRows = ((vendorsResult.data ?? []) as Array<{
    id: string;
    name: string | null;
    status: string | null;
    created_at: string | null;
    updated_at: string | null;
  }>).map(
    (row): NotificationSourceRow => ({
      id: `vendor:${row.id}`,
      category: "vendors",
      title: row.status === "active" ? "Vendor active" : "Vendor updated",
      body: `${row.name?.trim() || "Unnamed vendor"} is currently ${row.status?.trim() || "pending"}.`,
      href: `/admin/vendors/${row.id}/edit`,
      occurredAt: row.updated_at ?? row.created_at,
    }),
  );

  const invitationRows = ((invitationsResult.data ?? []) as Array<{
    user_id: string | null;
    status: string | null;
    created_at: string | null;
  }>).map(
    (row): NotificationSourceRow => ({
      id: `vendor-invitation:${row.user_id ?? "unknown"}:${row.created_at ?? "0"}`,
      category: "vendors",
      title: "Vendor invitation queued",
      body: `A vendor access request is marked ${row.status?.trim() || "pending"} and waiting for follow-up.`,
      href: "/admin/vendors?view=applications",
      occurredAt: row.created_at,
    }),
  );

  return [...vendorRows, ...invitationRows];
}

async function getCatalogNotifications(
  supabase: SupabaseClient,
  table: "brands" | "categories",
  href: string,
  category: AdminNotificationItem["category"],
) {
  const { data } = await supabase
    .from(table)
    .select("id, name, created_at")
    .order("created_at", { ascending: false })
    .limit(4);

  return ((data ?? []) as Array<{
    id: string;
    name: string | null;
    created_at: string | null;
  }>).map(
    (row): NotificationSourceRow => ({
      id: `${table}:${row.id}`,
      category,
      title: table === "brands" ? "Brand created" : "Category created",
      body: `${row.name?.trim() || "Untitled"} was added to the catalog structure.`,
      href,
      occurredAt: row.created_at,
    }),
  );
}

async function getHomepageNotifications(supabase: SupabaseClient) {
  const [themesResult, sectionsResult, bannersResult] = await Promise.all([
    supabase
      .from("homepage_themes")
      .select("id, name, updated_at")
      .order("updated_at", { ascending: false })
      .limit(3),
    supabase
      .from("homepage_product_sections")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("homepage_banners")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(2),
  ]);

  const themeRows = ((themesResult.data ?? []) as Array<{
    id: string;
    name: string | null;
    updated_at: string | null;
  }>).map(
    (row): NotificationSourceRow => ({
      id: `homepage-theme:${row.id}`,
      category: "homepage",
      title: "Homepage theme changed",
      body: `${row.name?.trim() || "Theme"} was updated in the homepage engine.`,
      href: `/admin/homepage/themes/${row.id}/edit`,
      occurredAt: row.updated_at,
    }),
  );

  const sectionRows = ((sectionsResult.data ?? []) as Array<{
    id: string;
    title: string | null;
    created_at: string | null;
  }>).map(
    (row): NotificationSourceRow => ({
      id: `homepage-section:${row.id}`,
      category: "homepage",
      title: "Homepage product section added",
      body: `${row.title?.trim() || "Untitled section"} was added to homepage merchandising.`,
      href: "/admin/homepage/product-sections",
      occurredAt: row.created_at,
    }),
  );

  const bannerRows = ((bannersResult.data ?? []) as Array<{
    id: string;
    title: string | null;
    created_at: string | null;
  }>).map(
    (row): NotificationSourceRow => ({
      id: `homepage-banner:${row.id}`,
      category: "homepage",
      title: "Homepage banner scheduled",
      body: `${row.title?.trim() || "A banner"} was added to the homepage banner queue.`,
      href: "/admin/homepage/banners",
      occurredAt: row.created_at,
    }),
  );

  return [...themeRows, ...sectionRows, ...bannerRows];
}

async function getSettingsNotifications(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("platform_settings")
    .select("site_title, updated_at")
    .eq("singleton_key", "default")
    .maybeSingle();

  if (!data) {
    return [] as NotificationSourceRow[];
  }

  return [
    {
      id: "platform-settings:default",
      category: "settings",
      title: "Platform settings updated",
      body: `${(data as { site_title?: string | null }).site_title?.trim() || "Marketplace settings"} changed recently.`,
      href: "/admin/settings",
      occurredAt: (data as { updated_at?: string | null }).updated_at,
    } satisfies NotificationSourceRow,
  ];
}

export async function listAdminNotifications(supabase: SupabaseClient, userId: string) {
  const stateResult = await getAdminNotificationState(supabase, userId);
  const lastReadAt = stateResult.data.last_read_at;

  const [orders, products, vendors, brands, categories, homepage, settings] = await Promise.all([
    getOrderNotifications(supabase),
    getProductNotifications(supabase),
    getVendorNotifications(supabase),
    getCatalogNotifications(supabase, "brands", "/admin/brands", "brands"),
    getCatalogNotifications(supabase, "categories", "/admin/categories", "categories"),
    getHomepageNotifications(supabase),
    getSettingsNotifications(supabase),
  ]);

  const notifications = mapRowsToNotifications(
    [...orders, ...products, ...vendors, ...brands, ...categories, ...homepage, ...settings].slice(0, 80),
    lastReadAt,
  ).slice(0, 24);

  return {
    data: notifications,
    unreadCount: notifications.filter((item) => item.isUnread).length,
    lastReadAt,
    error: null,
  };
}

export async function markAdminNotificationsRead(supabase: SupabaseClient, userId: string) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("admin_notification_states")
    .upsert(
      {
        user_id: userId,
        last_read_at: now,
        updated_at: now,
      } as never,
      { onConflict: "user_id" },
    );

  return {
    data: {
      lastReadAt: now,
    },
    error,
  };
}

export async function markAdminNotificationsReadUpTo(
  supabase: SupabaseClient,
  userId: string,
  occurredAt: string,
) {
  const normalizedOccurredAt = normalizeTimestamp(occurredAt) ?? new Date().toISOString();
  const stateResult = await getAdminNotificationState(supabase, userId);
  const currentLastReadAt = normalizeTimestamp(stateResult.data.last_read_at) ?? "1970-01-01T00:00:00.000Z";
  const nextLastReadAt =
    new Date(normalizedOccurredAt).getTime() > new Date(currentLastReadAt).getTime()
      ? normalizedOccurredAt
      : currentLastReadAt;

  const { error } = await supabase
    .from("admin_notification_states")
    .upsert(
      {
        user_id: userId,
        last_read_at: nextLastReadAt,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "user_id" },
    );

  return {
    data: {
      lastReadAt: nextLastReadAt,
    },
    error,
  };
}
