"use client";

import DashboardBadge from "./dashboard-badge";
import type { DashboardMetricItem } from "./types";

function ArrowUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.602 2.337A.75.75 0 0 1 8.696 2.302l4 3.997a.75.75 0 1 1-1.06 1.061L8.914 4.64V13.5a.75.75 0 0 1-1.5 0V4.644L4.697 7.36a.75.75 0 1 1-1.06-1.061l3.965-3.962Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.398 13.663a.75.75 0 0 1-1.094.035l-4-3.998a.75.75 0 1 1 1.06-1.06l2.722 2.72V2.5a.75.75 0 0 1 1.5 0v8.856l2.717-2.716a.75.75 0 0 1 1.06 1.06l-3.965 3.963Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MetricIcon({ type }: { type: DashboardMetricItem["icon"] }) {
  const common = "h-6 w-6 text-slate-800";
  if (type === "customers") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M16 19a4 4 0 0 0-8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="11" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M19 19a3 3 0 0 0-2.5-2.96M5 19a3 3 0 0 1 2.5-2.96M17.5 8.5A2.5 2.5 0 1 1 15 6M6.5 8.5A2.5 2.5 0 1 0 9 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "orders") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 8h8m-8 4h8m-8 4h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 3h10a2 2 0 0 1 2 2v14l-3-2-4 2-4-2-3 2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "products") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="m8 5 8 4.5M12 12v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 18v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function EcommerceMetrics({ items }: { items: DashboardMetricItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((item) => {
        const badgeColor = item.trend === "up" ? "success" : item.trend === "down" ? "error" : "light";
        return (
          <div key={item.label} className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
              <MetricIcon type={item.icon} />
            </div>

            <div className="mt-5 flex items-end justify-between gap-3">
              <div>
                <span className="text-sm text-gray-500">{item.label}</span>
                <h4 className="mt-2 text-3xl font-bold text-slate-900">{item.value}</h4>
              </div>
              <DashboardBadge color={badgeColor}>
                {item.trend === "up" ? <ArrowUpIcon /> : item.trend === "down" ? <ArrowDownIcon /> : null}
                {item.changeLabel}
              </DashboardBadge>
            </div>
          </div>
        );
      })}
    </div>
  );
}

