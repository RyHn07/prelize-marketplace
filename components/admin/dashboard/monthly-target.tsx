"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { ApexOptions } from "apexcharts";

import DashboardBadge from "./dashboard-badge";
import { AdminDropdown } from "@/components/admin/admin-dropdown";
import { AdminDropdownItem } from "@/components/admin/admin-dropdown-item";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

function MoreDotIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 4.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM10 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM10 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" fill="currentColor" />
    </svg>
  );
}

function TrendArrow({ up }: { up: boolean }) {
  return up ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M7.601 2.337a.75.75 0 0 1 1.095-.035l4 3.997a.75.75 0 1 1-1.061 1.061L8.914 4.64V13.5a.75.75 0 0 1-1.5 0V4.644L4.697 7.36a.75.75 0 0 1-1.06-1.061l3.964-3.962Z" fill="#039855" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M8.398 13.663a.75.75 0 0 1-1.095.035l-4-3.998A.75.75 0 1 1 4.364 8.64l2.722 2.72V2.5a.75.75 0 0 1 1.5 0v8.856l2.717-2.716a.75.75 0 1 1 1.06 1.06l-3.965 3.963Z" fill="#D92D20" />
    </svg>
  );
}

export default function MonthlyTarget({
  progress,
  targetValue,
  revenueValue,
  todayValue,
  growthLabel,
}: {
  progress: number;
  targetValue: string;
  revenueValue: string;
  todayValue: string;
  growthLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const series = [progress];
  const options: ApexOptions = {
    colors: ["#615FFF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "radialBar",
      height: 330,
      sparkline: { enabled: true },
    },
    plotOptions: {
      radialBar: {
        startAngle: -85,
        endAngle: 85,
        hollow: { size: "80%" },
        track: { background: "#E4E7EC", strokeWidth: "100%", margin: 5 },
        dataLabels: {
          name: { show: false },
          value: {
            fontSize: "36px",
            fontWeight: "600",
            offsetY: -40,
            color: "#1D2939",
            formatter: (value: number) => `${value.toFixed(2)}%`,
          },
        },
      },
    },
    fill: { type: "solid", colors: ["#615FFF"] },
    stroke: { lineCap: "round" },
    labels: ["Progress"],
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100">
      <div className="rounded-2xl bg-white px-5 pb-11 pt-5 shadow-sm sm:px-6 sm:pt-6">
        <div className="flex justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Monthly Target</h3>
            <p className="mt-1 text-sm text-gray-500">Target you&apos;ve set for each month</p>
          </div>
          <div className="relative inline-block">
            <button onClick={() => setIsOpen((current) => !current)} className="text-gray-400 transition-colors hover:text-gray-700" aria-label="Open target actions">
              <MoreDotIcon />
            </button>
            <AdminDropdown isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-40 p-2">
              <AdminDropdownItem onItemClick={() => setIsOpen(false)} className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900">
                View details
              </AdminDropdownItem>
            </AdminDropdown>
          </div>
        </div>

        <div className="relative">
          <div className="max-h-[330px]">
            <ReactApexChart options={options} series={series} type="radialBar" height={330} />
          </div>

          <span className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-[95%]">
            <DashboardBadge color={progress >= 50 ? "success" : "warning"}>{growthLabel}</DashboardBadge>
          </span>
        </div>
        <p className="mx-auto mt-10 max-w-[380px] text-center text-sm text-gray-500 sm:text-base">
          This month&apos;s marketplace revenue is pacing against your internal target. Keep monitoring orders and vendor activity.
        </p>
      </div>

      <div className="flex items-center justify-center gap-5 px-6 py-3.5 sm:gap-8 sm:py-5">
        <div>
          <p className="mb-1 text-center text-xs text-gray-500 sm:text-sm">Target</p>
          <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 sm:text-lg">
            {targetValue}
            <TrendArrow up={false} />
          </p>
        </div>

        <div className="h-7 w-px bg-gray-200"></div>

        <div>
          <p className="mb-1 text-center text-xs text-gray-500 sm:text-sm">Revenue</p>
          <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 sm:text-lg">
            {revenueValue}
            <TrendArrow up />
          </p>
        </div>

        <div className="h-7 w-px bg-gray-200"></div>

        <div>
          <p className="mb-1 text-center text-xs text-gray-500 sm:text-sm">Today</p>
          <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 sm:text-lg">
            {todayValue}
            <TrendArrow up />
          </p>
        </div>
      </div>
    </div>
  );
}
