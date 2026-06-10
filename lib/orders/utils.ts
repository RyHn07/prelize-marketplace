import type {
  OrderItemRow,
  OrderSummaryRow,
  ShippingMethodRow,
  VendorOrderRow,
  VendorOrderStatus,
} from "@/types/product-db";

export const ORDER_STATUSES: VendorOrderStatus[] = [
  "Order Placed",
  "Payment Verified",
  "Processing",
  "Arrived in Warehouse",
  "Shipped",
  "Ready to Deliver",
  "Delivered",
  "Cancelled",
];

export const ORDER_PROGRESS_STEPS: VendorOrderStatus[] = [
  "Order Placed",
  "Payment Verified",
  "Processing",
  "Arrived in Warehouse",
  "Shipped",
  "Ready to Deliver",
  "Delivered",
];

export const ORDER_STATUS_DESCRIPTIONS: Record<VendorOrderStatus, string> = {
  "Order Placed": "We received the order. Complete bank transfer and upload payment proof.",
  "Payment Verified": "Payment is verified. The order is ready for processing.",
  Processing: "Your items are being prepared and checked with the supplier.",
  "Arrived in Warehouse": "Items arrived in our warehouse and are being checked.",
  Shipped: "The order has left the warehouse and is on the way.",
  "Ready to Deliver": "The order is ready for final delivery.",
  Delivered: "The order has been delivered.",
  Cancelled: "This order has been cancelled.",
};

const LEGACY_ORDER_STATUS_MAP: Record<string, VendorOrderStatus> = {
  Pending: "Order Placed",
  Confirmed: "Payment Verified",
  Processing: "Processing",
  Shipped: "Shipped",
  Delivered: "Delivered",
  Completed: "Delivered",
  Cancelled: "Cancelled",
};

export function safeOrderStatus(value: unknown): VendorOrderStatus {
  if (ORDER_STATUSES.includes(value as VendorOrderStatus)) {
    return value as VendorOrderStatus;
  }

  if (typeof value === "string" && LEGACY_ORDER_STATUS_MAP[value]) {
    return LEGACY_ORDER_STATUS_MAP[value];
  }

  return "Order Placed";
}

export function formatBDT(amount: number) {
  return `\u09F3${amount.toLocaleString()}`;
}

export function formatOrderDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getStatusColor(status: string) {
  switch (status) {
    case "Order Placed":
      return "bg-yellow-100 text-yellow-700";
    case "Payment Verified":
      return "bg-blue-100 text-blue-700";
    case "Processing":
      return "bg-purple-100 text-purple-700";
    case "Arrived in Warehouse":
      return "bg-cyan-100 text-cyan-700";
    case "Shipped":
      return "bg-indigo-100 text-indigo-700";
    case "Ready to Deliver":
      return "bg-green-100 text-green-700";
    case "Delivered":
      return "bg-emerald-100 text-emerald-700";
    case "Cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export type GroupedOrderItem = {
  productId: string;
  name: string;
  image: string | null;
  items: OrderItemRow[];
  variantCount: number;
  totalQuantity: number;
  subtotal: number;
};

export function groupOrderItems(items: OrderItemRow[]) {
  const groups = new Map<string, GroupedOrderItem>();

  items.forEach((item) => {
    const itemSubtotal = item.total_price ?? item.price * item.quantity;
    const existingGroup = groups.get(item.product_id);

    if (existingGroup) {
      existingGroup.items.push(item);
      existingGroup.variantCount += 1;
      existingGroup.totalQuantity += item.quantity;
      existingGroup.subtotal += itemSubtotal;
      return;
    }

    groups.set(item.product_id, {
      productId: item.product_id,
      name: item.product_name,
      image: item.product_image,
      items: [item],
      variantCount: 1,
      totalQuantity: item.quantity,
      subtotal: itemSubtotal,
    });
  });

  return Array.from(groups.values());
}

export function createEmptySummary(): OrderSummaryRow {
  return {
    quantity: 0,
    totalQuantity: 0,
    productPrice: 0,
    cddCharge: 0,
    shippingCost: 0,
    hasUnknownShipping: false,
    payNow: 0,
    payOnDelivery: 0,
  };
}

export function createVendorOrderSummary(
  items: Array<{ price: number; quantity: number; totalPrice?: number }>,
  shippingMethods: ShippingMethodRow[],
) {
  const summary = createEmptySummary();
  const subtotal = items.reduce((sum, item) => sum + (item.totalPrice ?? item.price * item.quantity), 0);
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);

  summary.quantity = quantity;
  summary.totalQuantity = quantity;
  summary.productPrice = subtotal;
  summary.payNow = subtotal;
  summary.payOnDelivery = shippingMethods.length > 0 ? "Vendor shipping pending review" : 0;

  return summary;
}

const ALLOWED_VENDOR_STATUS_TRANSITIONS: Record<VendorOrderStatus, VendorOrderStatus[]> = {
  "Order Placed": [],
  "Payment Verified": ["Processing", "Cancelled"],
  Processing: ["Arrived in Warehouse", "Cancelled"],
  "Arrived in Warehouse": ["Shipped", "Cancelled"],
  Shipped: ["Ready to Deliver"],
  "Ready to Deliver": ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

export function getAllowedVendorStatusTransitions(currentStatus: VendorOrderStatus) {
  return ALLOWED_VENDOR_STATUS_TRANSITIONS[currentStatus];
}

export function canTransitionVendorOrderStatus(
  currentStatus: VendorOrderStatus,
  nextStatus: VendorOrderStatus,
) {
  if (currentStatus === nextStatus) {
    return true;
  }

  return getAllowedVendorStatusTransitions(currentStatus).includes(nextStatus);
}

export function getVendorStatusTransitionError(
  currentStatus: VendorOrderStatus,
  nextStatus: VendorOrderStatus,
) {
  if (canTransitionVendorOrderStatus(currentStatus, nextStatus)) {
    return null;
  }

  const allowedStatuses = getAllowedVendorStatusTransitions(currentStatus);

  if (allowedStatuses.length === 0) {
    return `Vendor orders in ${currentStatus} cannot be changed further.`;
  }

  return `Invalid vendor order status change from ${currentStatus} to ${nextStatus}. Allowed next statuses: ${allowedStatuses.join(", ")}.`;
}

export function deriveParentOrderStatus(statuses: VendorOrderStatus[]) {
  const normalizedStatuses = statuses.map(safeOrderStatus);

  if (normalizedStatuses.length === 0) {
    return "Order Placed" as VendorOrderStatus;
  }

  if (normalizedStatuses.every((status) => status === "Cancelled")) {
    return "Cancelled" as VendorOrderStatus;
  }

  if (normalizedStatuses.every((status) => status === "Delivered")) {
    return "Delivered" as VendorOrderStatus;
  }

  if (normalizedStatuses.every((status) => status === "Ready to Deliver" || status === "Delivered")) {
    return "Ready to Deliver" as VendorOrderStatus;
  }

  if (normalizedStatuses.some((status) => status === "Shipped")) {
    return "Shipped" as VendorOrderStatus;
  }

  if (normalizedStatuses.some((status) => status === "Arrived in Warehouse")) {
    return "Arrived in Warehouse" as VendorOrderStatus;
  }

  if (normalizedStatuses.some((status) => status === "Processing")) {
    return "Processing" as VendorOrderStatus;
  }

  if (normalizedStatuses.some((status) => status === "Payment Verified")) {
    return "Payment Verified" as VendorOrderStatus;
  }

  return "Order Placed" as VendorOrderStatus;
}

export function summarizeOrderItems(items: OrderItemRow[]) {
  const summary = createEmptySummary();
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.total_price ?? item.price * item.quantity), 0);

  summary.quantity = quantity;
  summary.totalQuantity = quantity;
  summary.productPrice = subtotal;
  summary.payNow = subtotal;
  summary.payOnDelivery = 0;

  return summary;
}

export function normalizeVendorOrderRow(row: VendorOrderRow): VendorOrderRow {
  return {
    ...row,
    status: safeOrderStatus(row.status),
    summary: row.summary ?? createEmptySummary(),
    shipping_method: Array.isArray(row.shipping_method) ? row.shipping_method : [],
    vendor_note: typeof row.vendor_note === "string" ? row.vendor_note : null,
    admin_note: typeof row.admin_note === "string" ? row.admin_note : null,
  };
}
