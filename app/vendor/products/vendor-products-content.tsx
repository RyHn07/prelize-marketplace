"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import AdminEmptyState from "@/components/admin/admin-empty-state";
import { AdminDropdown } from "@/components/admin/admin-dropdown";
import { AdminDropdownItem } from "@/components/admin/admin-dropdown-item";
import ConfirmationDialog from "@/components/confirmation-dialog";
import { deleteVendorProductRecord } from "@/lib/vendor-product-actions";
import type { ProductCategoryOption, ProductDbRow, ProductStatus, ProductType, ProductVendorOption } from "@/types/product-db";

type VendorProductsResponse = {
  userEmail?: string | null;
  vendorId?: string | null;
  products?: ProductDbRow[];
  vendorOptions?: ProductVendorOption[];
  categoryOptions?: ProductCategoryOption[];
  error?: string;
};

function formatPrice(amount: number) {
  return `\u09F3${Number.isFinite(amount) ? amount.toLocaleString() : "0"}`;
}

function getProductStatus(product: ProductDbRow): ProductStatus {
  if (product.status === "active" || product.status === "disabled" || product.status === "draft") {
    return product.status;
  }

  return product.is_active ? "active" : "disabled";
}

function getProductType(product: ProductDbRow): ProductType {
  return product.product_type === "variable" ? "variable" : "single";
}

function StatusBadge({ status }: { status: ProductStatus }) {
  const classes =
    status === "active"
      ? "bg-emerald-100 text-emerald-700"
      : status === "draft"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-200 text-slate-600";

  const label = status === "disabled" ? "Archived" : status === "draft" ? "Draft" : "Published";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>{label}</span>;
}

function ProductTypeBadge({ type }: { type: ProductType }) {
  return (
    <span className="inline-flex rounded-full bg-[#615FFF]/10 px-3 py-1 text-xs font-semibold text-[#615FFF]">
      {type === "variable" ? "Variable Product" : "Single Product"}
    </span>
  );
}

function formatCreatedAt(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

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

function SortIcon() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true" className="text-slate-300">
      <path d="M5 1 8 4H2L5 1Z" fill="currentColor" />
      <path d="M5 11 2 8h6l-3 3Z" fill="currentColor" />
    </svg>
  );
}

function MoreDotIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3.75 9A.75.75 0 1 1 2.25 9a.75.75 0 0 1 1.5 0ZM9.75 9A.75.75 0 1 1 8.25 9a.75.75 0 0 1 1.5 0ZM15.75 9a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" fill="currentColor" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function VendorProductsContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasVendorWorkspaceAccess, setHasVendorWorkspaceAccess] = useState(false);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductDbRow[]>([]);
  const [vendorOptions, setVendorOptions] = useState<ProductVendorOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<ProductCategoryOption[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductStatus>("all");
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<ProductDbRow | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      const response = await fetch("/api/vendor/products", { cache: "no-store" });
      const result = (await response.json().catch(() => null)) as VendorProductsResponse | null;

      if (!isMounted) {
        return;
      }

      if (!response.ok || !result) {
        setErrorMessage(result?.error ?? "Unable to load vendor products.");
        setUserEmail(response.status === 401 ? null : "");
        setHasVendorWorkspaceAccess(false);
        setActiveVendorId(null);
        setLoading(false);
        return;
      }

      setUserEmail(result.userEmail ?? null);
      setHasVendorWorkspaceAccess(Boolean(result.vendorId));
      setActiveVendorId(result.vendorId ?? null);

      if (!result.userEmail || !result.vendorId) {
        setLoading(false);
        return;
      }

      setProducts(result.products ?? []);
      setVendorOptions(result.vendorOptions ?? []);
      setCategoryOptions(result.categoryOptions ?? []);
      setLoading(false);
    };

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const status = getProductStatus(product);
      const type = getProductType(product);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesSearch =
        query.length === 0 ||
        product.name.toLowerCase().includes(query) ||
        product.slug.toLowerCase().includes(query) ||
        String(product.category_id ?? "").toLowerCase().includes(query) ||
        type.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [products, searchQuery, statusFilter]);

  const successMessage = useMemo(() => {
    const status = searchParams.get("status");

    if (status === "created") {
      return "Product saved successfully.";
    }

    if (status === "updated") {
      return "Product updated successfully.";
    }

    return "";
  }, [searchParams]);

  const handleDeleteProduct = async () => {
    if (!pendingDeleteProduct) {
      return;
    }

    setDeletingProductId(pendingDeleteProduct.id);
    setErrorMessage("");
    setActionMessage("");

    try {
      const result = await deleteVendorProductRecord(pendingDeleteProduct.id);

      if (result.error) {
        setErrorMessage(result.error.message);
        return;
      }

      setProducts((current) => current.filter((currentProduct) => currentProduct.id !== pendingDeleteProduct.id));
      setActionMessage("Product deleted successfully.");
      setPendingDeleteProduct(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete the product.");
    } finally {
      setDeletingProductId(null);
    }
  };

  const vendorNameById = useMemo(
    () => new Map(vendorOptions.map((vendor) => [vendor.id, vendor.name])),
    [vendorOptions],
  );
  const categoryNameById = useMemo(
    () => new Map(categoryOptions.map((category) => [category.id, category.name])),
    [categoryOptions],
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading vendor products...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Vendor Products</h1>
        <p className="mt-3 text-sm text-slate-500">Please login to access your vendor products.</p>
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
        <h1 className="text-2xl font-semibold text-slate-900">Vendor Products</h1>
        <p className="mt-3 text-sm text-slate-500">No vendor account found.</p>
        <p className="mt-2 text-xs text-slate-400">
          Ask an admin to create a vendor record and active vendor membership for your user account.
        </p>
      </div>
    );
  }

  return (
    <section className="w-full space-y-6">
      <ConfirmationDialog
        open={pendingDeleteProduct !== null}
        title="Delete Product?"
        description={
          pendingDeleteProduct
            ? `Delete "${pendingDeleteProduct.name}" permanently from your vendor products?`
            : ""
        }
        confirmLabel="Delete Product"
        cancelLabel="Keep Product"
        tone="danger"
        isConfirming={pendingDeleteProduct ? deletingProductId === pendingDeleteProduct.id : false}
        onConfirm={() => void handleDeleteProduct()}
        onCancel={() => {
          if (deletingProductId) {
            return;
          }

          setPendingDeleteProduct(null);
        }}
      />

      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800">Products List</h3>
            <p className="mt-1 text-sm text-gray-500">
              Review catalog records, vendor assignments, pricing, and publishing status from one workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg bg-[#615FFF]/8 px-3 py-2 text-sm font-medium text-[#615FFF]">
              {filteredProducts.length} visible
            </div>
            <Link
              href="/vendor/products/new"
              className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Add Product
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-[380px]">
            <label htmlFor="product-search" className="sr-only">
              Search products
            </label>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <SearchIcon />
            </span>
            <input
              id="product-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by product name, slug, category id, or product type"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:w-56">
              <label htmlFor="status-filter" className="sr-only">
                Filter by status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | ProductStatus)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
              >
                <option value="all">All Status</option>
                <option value="active">Published</option>
                <option value="disabled">Archived</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
            >
              Clear
            </button>
          </div>
        </div>

        {successMessage || actionMessage ? (
          <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 sm:px-6">{actionMessage || successMessage}</div>
        ) : null}

        {errorMessage ? (
          <div className="border-b border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600 sm:px-6">{errorMessage}</div>
        ) : null}

        {products.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState
              title="No products found"
              description="No vendor products are assigned yet. Add your first product to start building your catalog."
              action={
                <Link
                  href="/vendor/products/new"
                  className="inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Add Product
                </Link>
              }
            />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-6">
            <AdminEmptyState title="No matching products found" description="Try another search term or change the product status filter." />
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[1180px]">
              <table className="min-w-full">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 sm:px-6">
                      <div className="flex items-center gap-2">
                        <span>Products</span>
                        <SortIcon />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      <div className="flex items-center gap-2">
                        <span>Category</span>
                        <SortIcon />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      <div className="flex items-center gap-2">
                        <span>Vendor</span>
                        <SortIcon />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      <div className="flex items-center gap-2">
                        <span>Price</span>
                        <SortIcon />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">MOQ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Created At</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map((product) => {
                    const status = getProductStatus(product);
                    const type = getProductType(product);

                    return (
                      <tr key={product.id}>
                        <td className="px-5 py-5 text-left sm:px-6">
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-slate-50">
                              {product.image_url ? (
                                <div
                                  role="img"
                                  aria-label={product.name}
                                  className="h-full w-full bg-cover bg-center"
                                  style={{ backgroundImage: `url("${product.image_url}")` }}
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-[10px] font-medium text-slate-400">No Image</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-800">{product.name}</p>
                              <span className="mt-1 block truncate text-xs text-gray-500">{product.slug}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-sm text-gray-500">{categoryNameById.get(product.category_id ?? "") ?? "Uncategorized"}</td>
                        <td className="px-4 py-5 text-sm text-gray-500">
                          {product.vendor_id ? vendorNameById.get(product.vendor_id) ?? "Assigned Vendor" : "Platform"}
                        </td>
                        <td className="px-4 py-5 text-sm font-semibold text-[#615FFF]">{formatPrice(product.price)}</td>
                        <td className="px-4 py-5 text-sm text-gray-500">{product.moq}</td>
                        <td className="px-4 py-5">
                          <ProductTypeBadge type={type} />
                        </td>
                        <td className="px-4 py-5">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-4 py-5 text-sm text-gray-500">{formatCreatedAt(product.created_at)}</td>
                        <td className="px-4 py-5 text-right">
                          <div className="relative inline-flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => setOpenActionMenuId((current) => (current === product.id ? null : product.id))}
                              className="dropdown-toggle inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                              aria-label={`Open actions for ${product.name}`}
                            >
                              <MoreDotIcon />
                            </button>
                            <AdminDropdown
                              isOpen={openActionMenuId === product.id}
                              onClose={() => setOpenActionMenuId(null)}
                              className="right-full mr-2 w-44 p-2"
                            >
                              <AdminDropdownItem
                                tag="a"
                                href={`/vendor/products/${product.id}/edit`}
                                onItemClick={() => setOpenActionMenuId(null)}
                                className="flex rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                              >
                                Edit Product
                              </AdminDropdownItem>
                              <AdminDropdownItem
                                tag="a"
                                href={`/products/${product.slug}`}
                                onItemClick={() => setOpenActionMenuId(null)}
                                className="flex rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                              >
                                View Storefront
                              </AdminDropdownItem>
                              <AdminDropdownItem
                                onClick={() => {
                                  setPendingDeleteProduct(product);
                                  setOpenActionMenuId(null);
                                }}
                                onItemClick={() => setOpenActionMenuId(null)}
                                className="flex rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              >
                                {deletingProductId === product.id ? "Deleting..." : "Delete Product"}
                              </AdminDropdownItem>
                            </AdminDropdown>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
