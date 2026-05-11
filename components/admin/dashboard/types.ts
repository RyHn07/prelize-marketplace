"use client";

export type DashboardOrderItem = {
  id: string;
  orderNumber: string;
  customerEmail: string;
  status: string;
  createdAt: string;
  payNowAmount: number;
};

export type DashboardMetricItem = {
  label: string;
  value: string;
  changeLabel: string;
  trend: "up" | "down" | "neutral";
  icon: "customers" | "orders" | "products" | "vendors";
};

export type DashboardOverviewItem = {
  label: string;
  value: string;
  progress: number;
};

