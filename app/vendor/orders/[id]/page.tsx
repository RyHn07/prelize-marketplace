"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  deriveParentOrderStatus,
  formatBDT,
  formatOrderDate,
  getAllowedVendorStatusTransitions,
  getStatusColor,
  getVendorStatusTransitionError,
  groupOrderItems,
  safeOrderStatus,
} from "@/lib/orders/utils";
import { getVendorWorkspaceAccessState } from "@/lib/marketplace-access";
import { getPgDataClient } from "@/lib/browser-app-client";
import type { OrderItemRow, ShippingMethodRow, VendorOrderRow } from "@/types/product-db";

type ParentOrderRow = {
  id: string;
  order_number: string;
  user_email: string;
  status: VendorOrderRow["status"];
  buyer: Record<string, string | number | boolean | null> | null;
  created_at: string;
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(status)}`}>
      {status}
    </span>
  );
}

function ProductImage({ src, alt }: { src?: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-xs font-medium text-slate-400">
        No Image
      </div>
    );
  }

  return (
    <div className="relative h-[72px] w-[72px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <Image src={src} alt={alt} fill sizes="72px" className="object-cover" />
    </div>
  );
}

export default function VendorOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasVendorWorkspaceAccess, setHasVendorWorkspaceAccess] = useState(false);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [vendorOrder, setVendorOrder] = useState<VendorOrderRow | null>(null);
  const [parentOrder, setParentOrder] = useState<ParentOrderRow | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [vendorNote, setVendorNote] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [noteMessage, setNoteMessage] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const dataClient = getPgDataClient();

    const loadVendorOrder = async () => {
      const resolvedParams = await params;
      const access = await getVendorWorkspaceAccessState(dataClient);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasVendorWorkspaceAccess(access.hasVendorWorkspaceAccess);
      setActiveVendorId(access.activeVendorId);

      if (!access.userEmail || !access.hasVendorWorkspaceAccess || !access.activeVendorId) {
        setLoading(false);
        return;
      }

      const { data: fetchedVendorOrder, error: vendorOrderError } = await dataClient
        .from("vendor_orders")
        .select("*")
        .eq("id", resolvedParams.id)
        .eq("vendor_id", access.activeVendorId)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (vendorOrderError || !fetchedVendorOrder) {
        setVendorOrder(null);
        setParentOrder(null);
        setOrderItems([]);
        setLoading(false);
        return;
      }

      const normalizedVendorOrder = {
        ...(fetchedVendorOrder as VendorOrderRow),
        status: safeOrderStatus((fetchedVendorOrder as VendorOrderRow).status),
        shipping_method: Array.isArray((fetchedVendorOrder as VendorOrderRow).shipping_method)
          ? (fetchedVendorOrder as VendorOrderRow).shipping_method
          : [],
      };

      const [{ data: fetchedParentOrder }, { data: fetchedItems }] = await Promise.all([
        dataClient
          .from("orders")
          .select("id, order_number, user_email, status, buyer, created_at")
          .eq("id", normalizedVendorOrder.order_id)
          .maybeSingle(),
        dataClient
          .from("order_items")
          .select("*")
          .eq("vendor_order_id", normalizedVendorOrder.id),
      ]);

      if (!isMounted) {
        return;
      }

      setVendorOrder(normalizedVendorOrder);
      setParentOrder((fetchedParentOrder as ParentOrderRow | null) ?? null);
      setOrderItems((fetchedItems ?? []) as OrderItemRow[]);
      setVendorNote(normalizedVendorOrder.vendor_note ?? "");
      setLoading(false);
    };

    void loadVendorOrder();

    return () => {
      isMounted = false;
    };
  }, [params]);

  const groupedItems = useMemo(() => groupOrderItems(orderItems), [orderItems]);
  const currentStatus = vendorOrder ? safeOrderStatus(vendorOrder.status) : "Order Placed";
  const selectableStatuses = useMemo(() => {
    const allowedNextStatuses = getAllowedVendorStatusTransitions(currentStatus);
    return [currentStatus, ...allowedNextStatuses];
  }, [currentStatus]);

  const handleStatusUpdate = async (nextStatus: VendorOrderRow["status"]) => {
    if (!vendorOrder) {
      setErrorMessage("Vendor order details are missing. Reload this page and try again.");
      return;
    }

    const transitionError = getVendorStatusTransitionError(currentStatus, nextStatus);

    if (transitionError) {
      setErrorMessage(transitionError);
      return;
    }

    const dataClient = getPgDataClient();
    setIsUpdatingStatus(true);
    setErrorMessage("");

    const { error } = await dataClient
      .from("vendor_orders")
      .update({ status: nextStatus } as never)
      .eq("id", vendorOrder.id)
      .eq("vendor_id", activeVendorId ?? "");

    if (error) {
      setErrorMessage("Unable to update vendor order status right now.");
      setIsUpdatingStatus(false);
      return;
    }

    const { data: siblingVendorOrders, error: siblingVendorOrdersError } = await dataClient
      .from("vendor_orders")
      .select("status")
      .eq("order_id", vendorOrder.order_id);

    if (siblingVendorOrdersError) {
      setVendorOrder({
        ...vendorOrder,
        status: nextStatus,
      });
      setErrorMessage("Vendor order status updated, but parent marketplace order sync failed while loading vendor statuses.");
      setIsUpdatingStatus(false);
      return;
    }

    const derivedParentStatus = deriveParentOrderStatus(
      ((siblingVendorOrders ?? []) as Array<{ status: VendorOrderRow["status"] }>).map((row) => safeOrderStatus(row.status)),
    );

    if (!parentOrder) {
      setVendorOrder({
        ...vendorOrder,
        status: nextStatus,
      });
      setErrorMessage("Vendor order status updated, but the parent marketplace order record is unavailable for status sync.");
      setIsUpdatingStatus(false);
      return;
    }

    const currentParentStatus = safeOrderStatus(parentOrder.status);

    if (currentParentStatus !== derivedParentStatus) {
      const { error: parentOrderSyncError } = await dataClient
        .from("orders")
        .update({ status: derivedParentStatus } as never)
        .eq("id", vendorOrder.order_id);

      if (parentOrderSyncError) {
        setVendorOrder({
          ...vendorOrder,
          status: nextStatus,
        });
        setErrorMessage(
          `Vendor order status updated, but parent marketplace order sync failed: ${parentOrderSyncError.message}`,
        );
        setIsUpdatingStatus(false);
        return;
      }
    }

    setVendorOrder({
      ...vendorOrder,
      status: nextStatus,
    });
    setParentOrder((current) =>
      current
        ? {
            ...current,
            status: derivedParentStatus,
          }
        : current,
    );
    setIsUpdatingStatus(false);
  };

  const handleSaveVendorNote = async () => {
    if (!vendorOrder) {
      return;
    }

    const dataClient = getPgDataClient();
    setIsSavingNote(true);
    setErrorMessage("");
    setNoteMessage("");

    const { error } = await dataClient
      .from("vendor_orders")
      .update({ vendor_note: vendorNote.trim() || null } as never)
      .eq("id", vendorOrder.id)
      .eq("vendor_id", activeVendorId ?? "");

    if (error) {
      setErrorMessage("Unable to save vendor note right now.");
      setIsSavingNote(false);
      return;
    }

    setVendorOrder({
      ...vendorOrder,
      vendor_note: vendorNote.trim() || null,
    });
    setNoteMessage("Vendor note saved");
    setIsSavingNote(false);
  };

  const shippingMethods = Array.isArray(vendorOrder?.shipping_method)
    ? (vendorOrder.shipping_method as ShippingMethodRow[])
    : [];

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading vendor order...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Vendor Order Details</h1>
        <p className="mt-3 text-sm text-slate-500">Please login to access vendor order details.</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (!hasVendorWorkspaceAccess || !activeVendorId) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Vendor Order Details</h1>
        <p className="mt-3 text-sm text-slate-500">Your account does not have vendor order access yet.</p>
      </div>
    );
  }

  if (!vendorOrder) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Vendor order not found</h1>
        <Link
          href="/vendor/orders"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <section className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/vendor/orders"
              className="inline-flex text-sm font-medium text-[#615FFF] transition-colors hover:text-[#4f4ce8]"
            >
              Back to Orders
            </Link>
            <h3 className="mt-2 text-base font-medium text-gray-800">
              {parentOrder?.order_number ?? vendorOrder.order_id}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Vendor order created {formatOrderDate(parentOrder?.created_at ?? vendorOrder.created_at)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={safeOrderStatus(vendorOrder.status)} />
            <select
              value={currentStatus}
              onChange={(event) => handleStatusUpdate(event.target.value as VendorOrderRow["status"])}
              disabled={isUpdatingStatus}
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
              aria-label={`Update status for ${parentOrder?.order_number ?? vendorOrder.order_id}`}
            >
              {selectableStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Invoice Style View</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    {parentOrder?.order_number ?? vendorOrder.order_id}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Vendor order created on {formatOrderDate(parentOrder?.created_at ?? vendorOrder.created_at)}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Vendor Status</p>
                    <div className="mt-2">
                      <StatusBadge status={safeOrderStatus(vendorOrder.status)} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Customer</p>
                    <p className="mt-2 truncate text-sm font-medium text-slate-700">
                      {parentOrder?.user_email ?? "Unknown"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Customer Information</h3>
                {parentOrder?.buyer && Object.keys(parentOrder.buyer).length > 0 ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {Object.entries(parentOrder.buyer)
                      .filter(([, value]) => value !== null && String(value).trim() !== "")
                      .slice(0, 6)
                      .map(([key, value]) => (
                        <div key={key}>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                            {key.replace(/_/g, " ")}
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-700">{String(value)}</p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">No buyer details available.</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Operations</h3>
                <div className="mt-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Update Vendor Status</p>
                  <select
                    value={currentStatus}
                    onChange={(event) => handleStatusUpdate(event.target.value as VendorOrderRow["status"])}
                    disabled={isUpdatingStatus}
                    className="mt-2 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                  >
                    {selectableStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Parent order status: {parentOrder ? safeOrderStatus(parentOrder.status) : "Unavailable"}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Vendor Order Items</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Invoice-style breakdown of products assigned to this vendor.
                  </p>
                </div>
              </div>

              {groupedItems.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm text-slate-500">No vendor order items found.</p>
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Variants</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupedItems.map((group) => (
                        <tr key={group.productId}>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-4">
                              <ProductImage src={group.image} alt={group.name} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">{group.name}</p>
                                <div className="mt-1 space-y-1">
                                  {group.items.slice(0, 3).map((item) => (
                                    <p key={item.id} className="text-xs text-slate-500">
                                      {item.variant_name ? `${item.variant_name}: ` : ""}
                                      {item.variant_value ?? item.variation}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">{group.variantCount} variant(s)</td>
                          <td className="px-4 py-4 text-sm text-slate-600">{group.totalQuantity}</td>
                          <td className="px-4 py-4 text-sm font-semibold text-[#615FFF]">{formatBDT(group.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Vendor Fulfillment Note</h2>
            <div className="mt-4 space-y-3">
              <textarea
                value={vendorNote}
                onChange={(event) => setVendorNote(event.target.value)}
                placeholder="Write sourcing, packing, or fulfillment notes for this vendor order..."
                className="min-h-32 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveVendorNote}
                  disabled={isSavingNote}
                  className="inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingNote ? "Saving..." : "Save Vendor Note"}
                </button>
                {noteMessage ? <p className="text-sm font-medium text-green-600">{noteMessage}</p> : null}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6">
          <div className="space-y-0 rounded-2xl border border-slate-200 bg-white px-5">
            <div className="flex items-center justify-between border-b border-slate-200 py-4">
              <span>Customer</span>
              <span className="font-medium text-slate-900">{parentOrder?.user_email ?? "Unknown"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 py-4">
              <span>Items</span>
              <span className="font-medium text-slate-900">{orderItems.length}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 py-4">
              <span>Total Qty</span>
              <span className="font-medium text-slate-900">
                {vendorOrder.summary.totalQuantity ?? vendorOrder.summary.quantity ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-4">
              <span>Vendor Total</span>
              <span className="font-semibold text-[#615FFF]">{formatBDT(vendorOrder.summary.payNow ?? 0)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Shipping Methods</h2>
            <div className="mt-4 space-y-3">
              {shippingMethods.length > 0 ? (
                shippingMethods.map((shippingMethod) => (
                  <div
                    key={`${shippingMethod.productId}-${shippingMethod.shippingProfileId}`}
                    className="rounded-lg border border-slate-200 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-slate-900">{shippingMethod.productName}</p>
                    <p className="mt-1 text-sm text-slate-500">Shipping Method: {shippingMethod.shippingProfileName}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No vendor shipping data available yet.</p>
              )}
            </div>
          </div>

          {vendorOrder.admin_note ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-900">Admin Note</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{vendorOrder.admin_note}</p>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
