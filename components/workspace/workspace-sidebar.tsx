"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import AdminBrandLogo from "@/components/admin/admin-brand-logo";
import {
  BellIcon,
  ChartIcon,
  ChevronDownIcon,
  CreditCardIcon,
  CustomerUsersIcon,
  GridIcon,
  HorizontalDotsIcon,
  ImageIcon,
  LayoutIcon,
  PackageIcon,
  SettingsIcon,
  ShoppingBagIcon,
  SidebarIconContainer,
  TruckIcon,
  UserPlusIcon,
  UsersIcon,
} from "@/components/admin/admin-icons";
import { useSidebar } from "@/components/admin/admin-sidebar-context";

import {
  isWorkspaceNavPathActive,
  isWorkspaceNavPathExact,
  type WorkspaceNavIcon,
  type WorkspaceNavItem,
} from "./workspace-navigation";

const iconMap: Record<WorkspaceNavIcon, React.ReactNode> = {
  grid: <GridIcon />,
  package: <PackageIcon />,
  shoppingBag: <ShoppingBagIcon />,
  users: <UsersIcon />,
  customerUsers: <CustomerUsersIcon />,
  userPlus: <UserPlusIcon />,
  image: <ImageIcon />,
  bell: <BellIcon />,
  layout: <LayoutIcon />,
  truck: <TruckIcon />,
  creditCard: <CreditCardIcon />,
  chart: <ChartIcon />,
  settings: <SettingsIcon />,
};

type WorkspaceSidebarProps = {
  homeHref: string;
  navigation: WorkspaceNavItem[];
  footerHref?: string;
  footerLabel?: string;
};

export default function WorkspaceSidebar({
  homeHref,
  navigation,
  footerHref = "/",
  footerLabel = "Back to Website",
}: WorkspaceSidebarProps) {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, closeMobileSidebar } = useSidebar();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();
  const [selectedSubmenu, setSelectedSubmenu] = useState<number | "closed" | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<number, number>>({});
  const subMenuRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const activeSubmenu = useMemo(() => {
    let matchedIndex: number | null = null;

    navigation.forEach((nav, index) => {
      if (nav.subItems?.some((subItem) => isWorkspaceNavPathActive(pathname, subItem.href, currentSearch))) {
        matchedIndex = index;
      }
    });

    return matchedIndex;
  }, [currentSearch, navigation, pathname]);

  const openSubmenu = selectedSubmenu === "closed" ? null : selectedSubmenu ?? activeSubmenu;

  const isTopLevelNavActive = (href: string) => {
    if (href === homeHref) {
      return isWorkspaceNavPathExact(pathname, href, currentSearch);
    }

    return isWorkspaceNavPathActive(pathname, href, currentSearch);
  };

  useEffect(() => {
    if (openSubmenu !== null && subMenuRefs.current[openSubmenu]) {
      setSubMenuHeight((previous) => ({
        ...previous,
        [openSubmenu]: subMenuRefs.current[openSubmenu]?.scrollHeight || 0,
      }));
    }
  }, [openSubmenu]);

  const closeOnMobile = () => {
    if (isMobileOpen) {
      closeMobileSidebar();
    }
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out lg:mt-0 ${
        isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"
      } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex py-8 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
        <Link href={homeHref} onClick={closeOnMobile}>
          {isExpanded || isHovered || isMobileOpen ? <AdminBrandLogo /> : <AdminBrandLogo compact />}
        </Link>
      </div>

      <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 flex text-xs uppercase leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? "Menu" : <HorizontalDotsIcon />}
              </h2>

              <ul className="flex flex-col gap-4">
                {navigation.map((nav, index) => {
                  const isGroupActive =
                    (nav.path ? isTopLevelNavActive(nav.path) : false) ||
                    nav.subItems?.some((subItem) => isWorkspaceNavPathActive(pathname, subItem.href, currentSearch));

                  return (
                    <li key={nav.name}>
                      {nav.subItems ? (
                        <button
                          type="button"
                          onClick={() => setSelectedSubmenu(openSubmenu === index ? "closed" : index)}
                          className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium ${
                            openSubmenu === index
                              ? "bg-[#efeeff] text-[#615FFF]"
                              : "text-gray-700 hover:bg-gray-100 hover:text-gray-700"
                          } ${!isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"}`}
                        >
                          <SidebarIconContainer active={openSubmenu === index || Boolean(isGroupActive)}>
                            {iconMap[nav.icon]}
                          </SidebarIconContainer>
                          {(isExpanded || isHovered || isMobileOpen) && <span>{nav.name}</span>}
                          {(isExpanded || isHovered || isMobileOpen) && (
                            <ChevronDownIcon
                              className={`ml-auto h-5 w-5 transition-transform duration-200 ${
                                openSubmenu === index ? "rotate-180 text-[#615FFF]" : "text-gray-500"
                              }`}
                            />
                          )}
                        </button>
                      ) : (
                        nav.path && (
                          <Link
                            href={nav.path}
                            onClick={closeOnMobile}
                            className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                              isTopLevelNavActive(nav.path)
                                ? "bg-[#efeeff] text-[#615FFF]"
                                : "text-gray-700 hover:bg-gray-100 hover:text-gray-700"
                            }`}
                          >
                            <SidebarIconContainer active={isTopLevelNavActive(nav.path)}>
                              {iconMap[nav.icon]}
                            </SidebarIconContainer>
                            {(isExpanded || isHovered || isMobileOpen) && <span>{nav.name}</span>}
                          </Link>
                        )
                      )}

                      {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
                        <div
                          ref={(element) => {
                            subMenuRefs.current[index] = element;
                          }}
                          className="overflow-hidden transition-all duration-300"
                          style={{ height: openSubmenu === index ? `${subMenuHeight[index] ?? 0}px` : "0px" }}
                        >
                          <ul className="ml-9 mt-2 space-y-1">
                            {nav.subItems.map((subItem) => (
                              <li key={subItem.href}>
                                <Link
                                  href={subItem.href}
                                  onClick={closeOnMobile}
                                  className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                                    isWorkspaceNavPathExact(pathname, subItem.href, currentSearch)
                                      ? "bg-[#efeeff] text-[#615FFF]"
                                      : "text-gray-700 hover:bg-gray-100"
                                  }`}
                                >
                                  {subItem.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </nav>

        <div className="mt-auto border-t border-gray-200 py-5">
          <Link
            href={footerHref}
            onClick={closeOnMobile}
            className={`group flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 ${
              !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
            }`}
            title={footerLabel}
          >
            <span className="text-gray-500">&larr;</span>
            {(isExpanded || isHovered || isMobileOpen) && <span className="ml-3">{footerLabel}</span>}
          </Link>
        </div>
      </div>
    </aside>
  );
}
