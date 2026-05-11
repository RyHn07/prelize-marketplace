"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useSidebar } from "./admin-sidebar-context";
import {
  BoxCubeIcon,
  ChevronDownIcon,
  DollarLineIcon,
  FolderIcon,
  GridIcon,
  GroupIcon,
  HorizontalDotsIcon,
  ListIcon,
  PieChartIcon,
  PlugInIcon,
  SidebarIconContainer,
} from "./admin-icons";
import AdminSidebarWidget from "./admin-sidebar-widget";
import { adminNavigation, isNavPathActive, isNavPathExact } from "./admin-navigation";

const iconMap = {
  grid: <GridIcon />,
  boxCube: <BoxCubeIcon />,
  dollarLine: <DollarLineIcon />,
  group: <GroupIcon />,
  folder: <FolderIcon />,
  list: <ListIcon />,
  pieChart: <PieChartIcon />,
  plugIn: <PlugInIcon />,
};

export default function AdminSidebar() {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, closeMobileSidebar } = useSidebar();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();
  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<number, number>>({});
  const subMenuRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    let matchedIndex: number | null = null;

    adminNavigation.forEach((nav, index) => {
      if (nav.subItems?.some((subItem) => isNavPathActive(pathname, subItem.href, currentSearch))) {
        matchedIndex = index;
      }
    });

    setOpenSubmenu(matchedIndex);
  }, [currentSearch, pathname]);

  useEffect(() => {
    if (openSubmenu !== null && subMenuRefs.current[openSubmenu]) {
      setSubMenuHeight((prev) => ({
        ...prev,
        [openSubmenu]: subMenuRefs.current[openSubmenu]?.scrollHeight || 0,
      }));
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number) => {
    setOpenSubmenu((prev) => (prev === index ? null : index));
  };

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
        <Link href="/admin" onClick={closeOnMobile}>
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="rounded-lg bg-[#615FFF] px-4 py-3">
              <span className="text-sm font-semibold tracking-wide text-white">PRELIZE ADMIN</span>
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#615FFF]">
              <span className="text-sm font-semibold text-white">P</span>
            </div>
          )}
        </Link>
      </div>

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
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
                {adminNavigation.map((nav, index) => {
                  const isGroupActive =
                    (nav.path ? isNavPathActive(pathname, nav.path, currentSearch) : false) ||
                    nav.subItems?.some((subItem) => isNavPathActive(pathname, subItem.href, currentSearch));

                  return (
                    <li key={nav.name}>
                      {nav.subItems ? (
                        <button
                          onClick={() => handleSubmenuToggle(index)}
                          className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium ${
                            openSubmenu === index ? "bg-[#efeeff] text-[#615FFF]" : "text-gray-700 hover:bg-gray-100 hover:text-gray-700"
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
                              isNavPathActive(pathname, nav.path, currentSearch)
                                ? "bg-[#efeeff] text-[#615FFF]"
                                : "text-gray-700 hover:bg-gray-100 hover:text-gray-700"
                            }`}
                          >
                            <SidebarIconContainer active={isNavPathActive(pathname, nav.path, currentSearch)}>
                              {iconMap[nav.icon]}
                            </SidebarIconContainer>
                            {(isExpanded || isHovered || isMobileOpen) && <span>{nav.name}</span>}
                          </Link>
                        )
                      )}

                      {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
                        <div
                          ref={(el) => {
                            subMenuRefs.current[index] = el;
                          }}
                          className="overflow-hidden transition-all duration-300"
                          style={{
                            height: openSubmenu === index ? `${subMenuHeight[index] ?? 0}px` : "0px",
                          }}
                        >
                          <ul className="ml-9 mt-2 space-y-1">
                            {nav.subItems.map((subItem) => (
                              <li key={subItem.href}>
                                <Link
                                  href={subItem.href}
                                  onClick={closeOnMobile}
                                  className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                                    isNavPathExact(pathname, subItem.href, currentSearch)
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

        {isExpanded || isHovered || isMobileOpen ? <AdminSidebarWidget /> : null}
      </div>
    </aside>
  );
}
