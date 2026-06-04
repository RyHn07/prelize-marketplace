"use client";

export type WorkspaceNavChild = {
  label: string;
  href: string;
};

export type WorkspaceNavIcon =
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

export type WorkspaceNavItem = {
  name: string;
  icon: WorkspaceNavIcon;
  path?: string;
  subItems?: WorkspaceNavChild[];
};

function splitHref(href: string) {
  const [pathname, query = ""] = href.split("?");

  return { pathname, query };
}

export function isWorkspaceNavPathActive(pathname: string, href: string, currentSearch = "") {
  const { pathname: normalizedPath, query } = splitHref(href);

  if (pathname !== normalizedPath && !pathname.startsWith(`${normalizedPath}/`)) {
    return false;
  }

  if (!query) {
    return true;
  }

  const activeSearch = new URLSearchParams(currentSearch);
  const targetSearch = new URLSearchParams(query);

  return Array.from(targetSearch.entries()).every(([key, value]) => activeSearch.get(key) === value);
}

export function isWorkspaceNavPathExact(pathname: string, href: string, currentSearch = "") {
  const { pathname: normalizedPath, query } = splitHref(href);

  if (pathname !== normalizedPath) {
    return false;
  }

  const activeSearch = new URLSearchParams(currentSearch);

  if (!query) {
    return Array.from(activeSearch.entries()).length === 0;
  }

  const targetSearch = new URLSearchParams(query);

  return Array.from(targetSearch.entries()).every(([key, value]) => activeSearch.get(key) === value);
}
