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
import { getSupabaseClient } from "@/lib/supabase-client";
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
    const supabase = getSupabaseClient();

    const loadVendorOrder = async () => {
      const resolvedParams = await params;
      const access = await getVendorWorkspaceAccessState(supabase);

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

      const { data: fetchedVendorOrder, error: vendorOrderError } = await supabase
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
        supabase
          .from("orders")
          .select("id, order_number, user_email, status, buyer, created_at")
          .eq("id", normalizedVendorOrder.order_id)
          .maybeSingle(),
        supabase
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
  const currentStatus = vendorOrder ? safeOrderStatus(vendorOrder.status) : "Pending";
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

    const supabase = getSupabaseClient();
    setIsUpdatingStatus(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("vendor_orders")
      .update({ status: nextStatus } as never)
      .eq("id", vendorOrder.id)
      .eq("vendor_id", activeVendorId ?? "");

    if (error) {
      setErrorMessage("Unable to update vendor order status right now.");
      setIsUpdatingStatus(false);
      return;
    }

    const { data: siblingVendorOrders, error: siblingVendorOrdersError } = await supabase
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
      const { error: parentOrderSyncError } = await supabase
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

    const supabase = getSupabaseClient();
    setIsSavingNote(true);
    setErrorMessage("");
    setNoteMessage("");

    const { error } = await supabase
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
    <section className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            href="/vendor/orders"
            className="inline-flex text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-700"
          >
            Back to Orders
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            {parentOrder?.order_number ?? vendorOrder.order_id}
          </h1>
          <p className="text-sm text-slate-500">
            Vendor order created {formatOrderDate(parentOrder?.created_at ?? vendorOrder.created_at)}
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <StatusBadge status={safeOrderStatus(vendorOrder.status)} />
          <select
            value={currentStatus}
            onChange={(event) => handleStatusUpdate(event.target.value as VendorOrderRow["status"])}
            disabled={isUpdatingStatus}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            {selectableStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Customer Information</h2>
            {parentOrder?.buyer && Object.keys(parentOrder.buyer).length > 0 ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {Object.entries(parentOrder.buyer).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{key.replace(/_/g, " ")}</p>
                    <p className="mt-1 text-sm text-slate-700">{value === null ? "-" : String(value)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No buyer details available.</p>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Vendor Order Items</h2>
            {groupedItems.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-500">No vendor order items found.</p>
              </div>
            ) : (
              groupedItems.map((group) => (
                <article key={group.productId} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex gap-4 border-b border-slate-200 pb-4">
                    <ProductImage src={group.image} alt={group.name} />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <h3 className="text-base font-semibold text-slate-900">{group.name}</h3>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                            <span>Total Variants: {group.variantCount}</span>
                            <span>Total Qty: {group.totalQuantity}</span>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Product Subtotal</p>
                          <p className="mt-1 text-base font-semibold text-emerald-700">{formatBDT(group.subtotal)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {group.items.map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-200 px-4 py-3">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-slate-900">
                            Variation: {item.variant_value ?? item.variation}
                          </p>
                          {item.variant_name ? <p className="text-xs text-slate-500">Type: {item.variant_name}</p> : null}
                          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-4">
                            <p>Quantity: {item.quantity}</p>
                            <p>Unit Price: {formatBDT(item.unit_price ?? item.price)}</p>
                            <p className="sm:col-span-2 sm:text-right">
                              Row Total: <span className="font-medium text-slate-900">{formatBDT(item.total_price ?? item.price * item.quantity)}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Vendor Fulfillment Note</h2>
            <div className="mt-4 space-y-3">
              <textarea
                value={vendorNote}
                onChange={(event) => setVendorNote(event.target.value)}
                placeholder="Write sourcing, packing, or fulfillment notes for this vendor order..."
                className="min-h-32 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-emerald-500"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveVendorNote}
                  disabled={isSavingNote}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingNote ? "Saving..." : "Save Vendor Note"}
                </button>
                {noteMessage ? <p className="text-sm font-medium text-emerald-700">{noteMessage}</p> : null}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Vendor Summary</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <span>Customer</span>
                <span className="font-medium text-slate-900">{parentOrder?.user_email ?? "Unknown"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Items</span>
                <span className="font-medium text-slate-900">{orderItems.length}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Total Qty</span>
                <span className="font-medium text-slate-900">{vendorOrder.summary.totalQuantity ?? vendorOrder.summary.quantity ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Vendor Total</span>
                <span className="font-semibold text-emerald-700">{formatBDT(vendorOrder.summary.payNow ?? 0)}</span>
              </div>
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
