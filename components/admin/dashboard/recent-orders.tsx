"use client";

import Link from "next/link";

import DashboardBadge from "./dashboard-badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "./dashboard-table";
import type { DashboardOrderItem } from "./types";

function getStatusColor(status: string) {
  switch (status) {
    case "Delivered":
    case "Completed":
      return "success";
    case "Pending":
      return "warning";
    case "Cancelled":
    case "Canceled":
      return "error";
    default:
      return "primary";
  }
}

export default function RecentOrders({
  orders,
  formatAmount,
  formatDate,
}: {
  orders: DashboardOrderItem[];
  formatAmount: (amount: number) => string;
  formatDate: (value: string) => string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-6 pb-4 pt-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xl font-semibold text-gray-800">Recent Orders</h3>

        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-800">
            Filter
          </Link>
          <Link href="/admin/orders" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-800">
            See all
          </Link>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y border-gray-100">
            <TableRow>
              <TableCell isHeader className="py-3.5 text-start text-xs font-medium text-gray-500">
                Order
              </TableCell>
              <TableCell isHeader className="py-3.5 text-start text-xs font-medium text-gray-500">
                Customer
              </TableCell>
              <TableCell isHeader className="py-3.5 text-start text-xs font-medium text-gray-500">
                Amount
              </TableCell>
              <TableCell isHeader className="py-3.5 text-start text-xs font-medium text-gray-500">
                Status
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100">
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="py-5">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{order.orderNumber}</p>
                    <span className="text-xs text-gray-500">{formatDate(order.createdAt)}</span>
                  </div>
                </TableCell>
                <TableCell className="py-5 text-sm text-gray-500">{order.customerEmail}</TableCell>
                <TableCell className="py-5 text-sm text-gray-500">{formatAmount(order.payNowAmount)}</TableCell>
                <TableCell className="py-5 text-sm text-gray-500">
                  <DashboardBadge color={getStatusColor(order.status) as "success" | "warning" | "error" | "primary"} size="sm">
                    {order.status}
                  </DashboardBadge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

