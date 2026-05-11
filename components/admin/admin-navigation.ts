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
    | "boxCube"
    | "dollarLine"
    | "group"
    | "folder"
    | "list"
    | "pieChart"
    | "plugIn";
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
    icon: "boxCube",
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
        label: "Product Reviews",
        href: "/admin/products?view=reviews",
        description: "Review customer product feedback from the marketplace.",
      },
    ],
  },
  {
    name: "Orders",
    icon: "dollarLine",
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
    icon: "group",
    subItems: [
      {
        label: "All Vendors",
        href: "/admin/vendors",
        description: "Manage active and inactive marketplace vendors.",
      },
      {
        label: "Vendor Applications",
        href: "/admin/vendors?view=applications",
        description: "Review onboarding submissions and approval stages.",
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
    icon: "group",
  },
  {
    name: "Media Library",
    path: "/admin/media",
    icon: "folder",
  },
  {
    name: "Shipping",
    icon: "list",
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
    icon: "dollarLine",
  },
  {
    name: "Reports / Analytics",
    path: "/admin?view=reports",
    icon: "pieChart",
  },
  {
    name: "Settings",
    path: "/admin/settings",
    icon: "plugIn",
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
