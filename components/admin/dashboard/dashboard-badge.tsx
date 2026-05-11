"use client";

import type { ReactNode } from "react";

type BadgeColor = "primary" | "success" | "error" | "warning" | "light";
type BadgeSize = "sm" | "md";

const colorMap: Record<BadgeColor, string> = {
  primary: "bg-[#efeeff] text-[#615FFF]",
  success: "bg-emerald-50 text-emerald-600",
  error: "bg-rose-50 text-rose-600",
  warning: "bg-amber-50 text-amber-600",
  light: "bg-slate-100 text-slate-600",
};

const sizeMap: Record<BadgeSize, string> = {
  sm: "px-2.5 py-0.5 text-[11px]",
  md: "px-3 py-1 text-xs",
};

export default function DashboardBadge({
  children,
  color = "primary",
  size = "md",
}: {
  children: ReactNode;
  color?: BadgeColor;
  size?: BadgeSize;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center gap-1 rounded-full font-medium ${colorMap[color]} ${sizeMap[size]}`}
    >
      {children}
    </span>
  );
}

