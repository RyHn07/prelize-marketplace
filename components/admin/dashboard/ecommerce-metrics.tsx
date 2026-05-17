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
        <path d="M16 20v-1.2c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C13.72 14 12.88 14 11.2 14H8.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C4 16.28 4 17.12 4 18.8V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 11a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 10 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 20v-1.2c0-1.47-.547-2.812-1.45-3.833M15.5 4.72A3.25 3.25 0 0 1 15.5 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "orders") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8.75 10.25V7.75a3.25 3.25 0 1 1 6.5 0v2.5M7.1 20.25h9.8c1.12 0 1.68 0 2.108-.218a2 2 0 0 0 .874-.874c.218-.428.218-.988.218-2.108v-4.8c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874c-.428-.218-.988-.218-2.108-.218H7.1c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874c-.218.428-.218.988-.218 2.108v4.8c0 1.12 0 1.68.218 2.108a2 2 0 0 0 .874.874c.428.218.988.218 2.108.218Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "products") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="m7.5 6.25 4.5 2.625 4.5-2.625M12 8.875v8.875M5.55 7.438l5.4 3.15c.397.232.595.347.806.392.187.04.381.04.568 0 .21-.045.409-.16.806-.392l5.4-3.15M6.8 19.75h10.4c1.12 0 1.68 0 2.108-.218a2 2 0 0 0 .874-.874c.218-.428.218-.988.218-2.108V7.45c0-1.12 0-1.68-.218-2.108a2 2 0 0 0-.874-.874c-.428-.218-.988-.218-2.108-.218H6.8c-1.12 0-1.68 0-2.108.218a2 2 0 0 0-.874.874C3.6 5.77 3.6 6.33 3.6 7.45v9.1c0 1.12 0 1.68.218 2.108a2 2 0 0 0 .874.874c.428.218.988.218 2.108.218Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M16 20v-1.2c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C13.72 14 12.88 14 11.2 14H8.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C4 16.28 4 17.12 4 18.8V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 10 11Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 20v-1.2c0-1.47-.547-2.812-1.45-3.833M15.5 4.72A3.25 3.25 0 0 1 15.5 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
