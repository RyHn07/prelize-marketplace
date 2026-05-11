"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { ApexOptions } from "apexcharts";

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

export default function MonthlySalesChart({ seriesData }: { seriesData: number[] }) {
  const [isOpen, setIsOpen] = useState(false);

  const options: ApexOptions = {
    colors: ["#615FFF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 180,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "39%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      show: true,
      width: 4,
      colors: ["transparent"],
    },
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#64748b", fontSize: "12px" } },
    },
    yaxis: {
      labels: { style: { colors: ["#64748b"], fontSize: "12px" } },
    },
    grid: {
      borderColor: "#e5e7eb",
      yaxis: { lines: { show: true } },
    },
    fill: { opacity: 1 },
    legend: { show: false },
    tooltip: {
      x: { show: false },
      y: { formatter: (value: number) => `${value} orders` },
    },
  };

  const series = [{ name: "Orders", data: seriesData }];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Monthly Sales</h3>

        <div className="relative inline-block">
          <button onClick={() => setIsOpen((current) => !current)} className="text-gray-400 transition-colors hover:text-gray-700" aria-label="Open sales chart actions">
            <MoreDotIcon />
          </button>
          <AdminDropdown isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-40 p-2">
            <AdminDropdownItem onItemClick={() => setIsOpen(false)} className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900">
              Refresh view
            </AdminDropdownItem>
            <AdminDropdownItem onItemClick={() => setIsOpen(false)} className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900">
              Open orders
            </AdminDropdownItem>
          </AdminDropdown>
        </div>
      </div>

      <div className="custom-scrollbar max-w-full overflow-x-auto">
        <div className="-ml-5 min-w-[650px] pl-2 xl:min-w-full">
          <ReactApexChart options={options} series={series} type="bar" height={180} />
        </div>
      </div>
    </div>
  );
}
