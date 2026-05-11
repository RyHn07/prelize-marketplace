"use client";

import { useState } from "react";

type Option = "overview" | "sales" | "revenue";

export default function ChartTab() {
  const [selected, setSelected] = useState<Option>("overview");

  const getButtonClass = (option: Option) =>
    selected === option
      ? "bg-white text-slate-900 shadow-sm"
      : "text-slate-500 hover:text-slate-900";

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
      <button onClick={() => setSelected("overview")} className={`w-full rounded-md px-3 py-2 text-sm font-medium ${getButtonClass("overview")}`}>
        Overview
      </button>
      <button onClick={() => setSelected("sales")} className={`w-full rounded-md px-3 py-2 text-sm font-medium ${getButtonClass("sales")}`}>
        Sales
      </button>
      <button onClick={() => setSelected("revenue")} className={`w-full rounded-md px-3 py-2 text-sm font-medium ${getButtonClass("revenue")}`}>
        Revenue
      </button>
    </div>
  );
}

