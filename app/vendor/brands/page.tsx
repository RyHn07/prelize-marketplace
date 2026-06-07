"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";

import AdminEmptyState from "@/components/admin/admin-empty-state";
import { createBrand, deleteBrand, updateBrand } from "@/lib/brands/actions";
import { getAdminBrands, getBrandProductCounts, type AdminBrandRow } from "@/lib/brands/queries";
import { getVendorWorkspaceAccessState } from "@/lib/marketplace-access";
import { uploadProductMedia } from "@/lib/media/storage";
import { getSupabaseClient } from "@/lib/supabase-client";

type BrandFormState = {
  name: string;
  slug: string;
  image_url: string;
};

const EMPTY_FORM: BrandFormState = {
  name: "",
  slug: "",
  image_url: "",
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-slate-400">
      <path
        d="M17.5 17.5l-3.625-3.625m1.958-4.042a5.667 5.667 0 11-11.333 0 5.667 5.667 0 0111.333 0z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true" className="text-slate-300">
      <path d="M5 1 8 4H2L5 1Z" fill="currentColor" />
      <path d="M5 11 2 8h6l-3 3Z" fill="currentColor" />
    </svg>
  );
}

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
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

export default function VendorBrandsPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasVendorWorkspaceAccess, setHasVendorWorkspaceAccess] = useState(false);
  const [brands, setBrands] = useState<AdminBrandRow[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [form, setForm] = useState<BrandFormState>(EMPTY_FORM);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingBrandId, setDeletingBrandId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadPage = async () => {
      const access = await getVendorWorkspaceAccessState(supabase);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasVendorWorkspaceAccess(access.hasVendorWorkspaceAccess);

      if (!access.userEmail || !access.hasVendorWorkspaceAccess) {
        setLoading(false);
        return;
      }

      const [brandResult, countResult] = await Promise.all([getAdminBrands(), getBrandProductCounts()]);

      if (!isMounted) {
        return;
      }

      if (brandResult.error) {
        setErrorMessage(brandResult.error.message);
        setBrands([]);
        setProductCounts({});
        setLoading(false);
        return;
      }

      if (countResult.error) {
        setErrorMessage(countResult.error.message);
      }

      setBrands(brandResult.data);
      setProductCounts(countResult.data);
      setLoading(false);
    };

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredBrands = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return brands;
    }

    return brands.filter((brand) => brand.name.toLowerCase().includes(query) || brand.slug.toLowerCase().includes(query));
  }, [brands, searchQuery]);

  const resetForm = () => {
    setEditingBrandId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(false);
  };

  const handleOpenCreateModal = () => {
    setEditingBrandId(null);
    setForm(EMPTY_FORM);
    setErrorMessage("");
    setSuccessMessage("");
    setIsModalOpen(true);
  };

  const handleEdit = (brand: AdminBrandRow) => {
    setEditingBrandId(brand.id);
    setForm({
      name: brand.name,
      slug: brand.slug,
      image_url: brand.image_url ?? "",
    });
    setErrorMessage("");
    setSuccessMessage("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = form.name.trim();

    if (!trimmedName) {
      setErrorMessage("Brand name is required.");
      setSuccessMessage("");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      name: trimmedName,
      slug: form.slug.trim() || toSlug(trimmedName),
      image_url: form.image_url.trim() || null,
    };

    const result = editingBrandId ? await updateBrand(editingBrandId, payload) : await createBrand(payload);

    if (result.error || !result.data) {
      setErrorMessage(result.error?.message ?? "Unable to save the brand right now.");
      setIsSaving(false);
      return;
    }

    setBrands((current) => {
      if (editingBrandId) {
        return current
          .map((brand) => (brand.id === editingBrandId ? result.data! : brand))
          .sort((left, right) => left.name.localeCompare(right.name));
      }

      return [...current, result.data!].sort((left, right) => left.name.localeCompare(right.name));
    });
    setSuccessMessage(editingBrandId ? "Brand updated successfully." : "Brand created successfully.");
    resetForm();
    setIsSaving(false);
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    setIsUploadingImage(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await uploadProductMedia(file);

      if (result.error || !result.data) {
        setErrorMessage(result.error?.message ?? "Unable to upload brand image.");
        setIsUploadingImage(false);
        return;
      }

      setForm((current) => ({
        ...current,
        image_url: result.data!.publicUrl,
      }));
      setSuccessMessage("Brand image uploaded successfully.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to upload brand image.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDelete = async (brand: AdminBrandRow) => {
    setDeletingBrandId(brand.id);
    setErrorMessage("");
    setSuccessMessage("");

    const result = await deleteBrand(brand.id);

    if (result.error) {
      setErrorMessage(result.error.message);
      setDeletingBrandId(null);
      return;
    }

    setBrands((current) => current.filter((entry) => entry.id !== brand.id));
    setProductCounts((current) => {
      const nextCounts = { ...current };
      delete nextCounts[brand.id];
      return nextCounts;
    });

    if (editingBrandId === brand.id) {
      resetForm();
    }

    setSuccessMessage("Brand deleted successfully.");
    setDeletingBrandId(null);
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Loading brands...</div>;
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Vendor Brands</h1>
        <p className="mt-3 text-sm text-slate-500">Please login to access vendor brands.</p>
        <Link href="/login" className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90">
          Go to Login
        </Link>
      </div>
    );
  }

  if (!hasVendorWorkspaceAccess) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Vendor Brands</h1>
        <p className="mt-3 text-sm text-slate-500">No vendor account found.</p>
      </div>
    );
  }

  return (
    <section className="w-full space-y-6">
      {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">{errorMessage}</div> : null}
      {successMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">{successMessage}</div> : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800">Brand List</h3>
            <p className="mt-1 text-sm text-gray-500">Create product brands, upload brand marks, and keep catalog branding organized.</p>
          </div>

          <button type="button" onClick={handleOpenCreateModal} className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
            Add Brand
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-[380px]">
            <label htmlFor="brand-search" className="sr-only">Search brands</label>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"><SearchIcon /></span>
            <input
              id="brand-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by brand name or slug"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
            />
          </div>

          <button type="button" onClick={() => setSearchQuery("")} className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900">
            Clear
          </button>
        </div>

        {brands.length === 0 ? (
          <div className="p-6"><AdminEmptyState title="No brands yet" description="Create your first brand to connect it with products." /></div>
        ) : filteredBrands.length === 0 ? (
          <div className="p-6"><AdminEmptyState title="No matching brands" description="Try another search term." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 sm:px-6">
                    <div className="flex items-center gap-2"><span>Name</span><SortIcon /></div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Image</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Products</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Slug</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Created At</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBrands.map((brand) => {
                  const linkedProductCount = productCounts[brand.id] ?? 0;
                  const isDeleting = deletingBrandId === brand.id;

                  return (
                    <tr key={brand.id}>
                      <td className="px-5 py-5 text-left sm:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#465FFF]/20 bg-[#465FFF]/5 text-xs font-semibold text-[#465FFF]">
                            {brand.name.trim().charAt(0).toUpperCase() || "B"}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{brand.name}</p>
                            <p className="truncate text-xs text-slate-500">Catalog brand</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        {brand.image_url ? (
                          <div role="img" aria-label={brand.name} className="h-10 w-10 rounded-full border border-slate-200 bg-cover bg-center" style={{ backgroundImage: `url("${brand.image_url}")` }} />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-slate-200 text-xs text-slate-400">N/A</div>
                        )}
                      </td>
                      <td className="px-4 py-5 text-sm font-medium text-slate-700">{linkedProductCount > 0 ? `${linkedProductCount} product${linkedProductCount === 1 ? "" : "s"}` : "-"}</td>
                      <td className="px-4 py-5 text-sm text-slate-600">{brand.slug}</td>
                      <td className="px-4 py-5 text-sm text-slate-600">{formatDate(brand.created_at)}</td>
                      <td className="px-4 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => handleEdit(brand)} className="inline-flex items-center justify-center rounded-md bg-[#465FFF] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#3641f5]">Edit</button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(brand)}
                            disabled={linkedProductCount > 0 || isDeleting}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Delete ${brand.name}`}
                          >
                            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                              <path d="M5.833 7.5v7.083A1.417 1.417 0 007.25 16h5.5a1.417 1.417 0 001.417-1.417V7.5M8.333 9.583v4.167m3.334-4.167v4.167M4.167 5.417h11.666M8.75 3.75h2.5a.833.833 0 01.833.833v.834h-4.166v-.834A.833.833 0 018.75 3.75z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 px-4 py-8">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-sm font-semibold text-[#465FFF]">{editingBrandId ? "Edit Brand" : "Add Brand"}</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">{editingBrandId ? "Update brand details" : "Create a new product brand"}</h2>
              </div>
              <button type="button" onClick={resetForm} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900" aria-label="Close brand modal">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>

            <form className="space-y-5 px-6 py-6" onSubmit={handleSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block space-y-1.5 md:col-span-2">
                  <span className="block text-sm font-medium text-slate-700">Brand Name</span>
                  <input type="text" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Nike" className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-sm outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10" />
                </label>

                <label className="block space-y-1.5 md:col-span-2">
                  <span className="block text-sm font-medium text-slate-700">Slug</span>
                  <input type="text" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} placeholder="Auto-generate from name" className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-sm outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10" />
                </label>

                <label className="block space-y-1.5 md:col-span-2">
                  <span className="block text-sm font-medium text-slate-700">Brand Image</span>
                  <input type="url" value={form.image_url} onChange={(event) => setForm((current) => ({ ...current, image_url: event.target.value }))} placeholder="Paste uploaded image URL or upload below" className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-sm outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10" />
                </label>

                <div className="md:col-span-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900">
                      {isUploadingImage ? "Uploading..." : "Upload Image"}
                      <input type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0] ?? null; void handleImageUpload(file); event.target.value = ""; }} />
                    </label>
                    <p className="text-xs text-slate-400">This image can be reused wherever the brand is referenced later.</p>
                  </div>
                  {form.image_url ? (
                    <div className="mt-4 flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div role="img" aria-label="Brand preview" className="h-16 w-16 overflow-hidden rounded-full bg-cover bg-center" style={{ backgroundImage: `url("${form.image_url}")` }} />
                      <p className="min-w-0 break-all text-xs text-slate-500">{form.image_url}</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
                <button type="button" onClick={resetForm} className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400">Cancel</button>
                <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSaving ? "Saving..." : editingBrandId ? "Save Changes" : "Create Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
