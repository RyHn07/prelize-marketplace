"use client";

export type AdminNavChild = {
  label: string;
  href: string;
  description: string;
};

export type AdminNavItem = {
  name: string;
  icon:
    | "grid"
    | "package"
    | "shoppingBag"
    | "users"
    | "customerUsers"
    | "userPlus"
    | "image"
    | "bell"
    | "layout"
    | "truck"
    | "creditCard"
    | "chart"
    | "settings";
  path?: string;
  subItems?: AdminNavChild[];
};

export const adminNavigation: AdminNavItem[] = [
  {
    name: "Dashboard",
    path: "/admin",
    icon: "grid",
  },
  {
    name: "Products",
    icon: "package",
    subItems: [
      {
        label: "All Products",
        href: "/admin/products",
        description: "Browse and manage the full marketplace catalog.",
      },
      {
        label: "Add Product",
        href: "/admin/products/new",
        description: "Create a new product listing draft.",
      },
      {
        label: "Categories",
        href: "/admin/categories",
        description: "Organize collections and product taxonomy.",
      },
      {
        label: "Brands",
        href: "/admin/brands",
        description: "Manage reusable product brands and brand assets.",
      },
      {
        label: "Product Reviews",
        href: "/admin/reviews",
        description: "Moderate customer product feedback across the marketplace.",
      },
    ],
  },
  {
    name: "Orders",
    icon: "shoppingBag",
    subItems: [
      {
        label: "All Orders",
        href: "/admin/orders",
        description: "View every order across the marketplace.",
      },
      {
        label: "Pending Orders",
        href: "/admin/orders?status=Pending",
        description: "Review orders waiting for action or fulfillment.",
      },
      {
        label: "Completed Orders",
        href: "/admin/orders?status=Delivered",
        description: "Reference delivered and closed transactions.",
      },
      {
        label: "Cancelled Orders",
        href: "/admin/orders?status=Cancelled",
        description: "Audit cancellations, reasons, and recovery patterns.",
      },
    ],
  },
  {
    name: "Vendors",
    icon: "userPlus",
    subItems: [
      {
        label: "All Vendors",
        href: "/admin/vendors",
        description: "Manage active and inactive marketplace vendors.",
      },
      {
        label: "Vendor Products",
        href: "/admin/products?view=vendor-products",
        description: "Inspect vendor-submitted catalog inventory.",
      },
    ],
  },
  {
    name: "Customers",
    path: "/admin/customers",
    icon: "customerUsers",
  },
  {
    name: "Media Library",
    path: "/admin/media",
    icon: "image",
  },
  {
    name: "Notifications",
    path: "/admin/notifications",
    icon: "bell",
  },
  {
    name: "Homepage",
    icon: "layout",
    subItems: [
      {
        label: "Theme Engine",
        href: "/admin/homepage",
        description: "Manage homepage themes, previews, and activation flow.",
      },
      {
        label: "Themes",
        href: "/admin/homepage/themes",
        description: "Create and switch homepage layouts without changing content.",
      },
      {
        label: "Content Blocks",
        href: "/admin/homepage/content",
        description: "Edit reusable homepage copy, cards, and CTA content.",
      },
      {
        label: "Product Sections",
        href: "/admin/homepage/product-sections",
        description: "Control dynamic homepage product feeds and merchandising strips.",
      },
    ],
  },
  {
    name: "Shipping",
    icon: "truck",
    subItems: [
      {
        label: "China Domestic Delivery",
        href: "/admin/cnds",
        description: "Prepare local delivery workflows within China.",
      },
      {
        label: "Bangladesh Shipping",
        href: "/admin/international-shipping",
        description: "Prepare shipping workflows for Bangladesh.",
      },
      {
        label: "Cost Calculator",
        href: "/admin/international-shipping?view=calculator",
        description: "Estimate delivery pricing and fee logic.",
      },
    ],
  },
  {
    name: "Payments",
    path: "/admin/orders?view=payments",
    icon: "creditCard",
  },
  {
    name: "Reports / Analytics",
    path: "/admin?view=reports",
    icon: "chart",
  },
  {
    name: "Settings",
    path: "/admin/settings",
    icon: "settings",
  },
];

function splitHref(href: string) {
  const [pathname, query = ""] = href.split("?");

  return { pathname, query };
}

export function isNavPathActive(pathname: string, href: string, currentSearch = "") {
  const { pathname: normalizedPath, query } = splitHref(href);

  if (normalizedPath === "/admin") {
    if (pathname !== "/admin") {
      return false;
    }
  } else if (!(pathname === normalizedPath || pathname.startsWith(`${normalizedPath}/`))) {
    return false;
  }

  if (!query) {
    return true;
  }

  const activeSearch = new URLSearchParams(currentSearch);
  const targetSearch = new URLSearchParams(query);

  return Array.from(targetSearch.entries()).every(([key, value]) => activeSearch.get(key) === value);
}

export function isNavPathExact(pathname: string, href: string, currentSearch = "") {
  const { pathname: normalizedPath, query } = splitHref(href);

  if (pathname !== normalizedPath) {
    return false;
  }

  if (!query) {
    return true;
  }

  const activeSearch = new URLSearchParams(currentSearch);
  const targetSearch = new URLSearchParams(query);

  return Array.from(targetSearch.entries()).every(([key, value]) => activeSearch.get(key) === value);
}
