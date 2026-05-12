"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";

import AdminEmptyState from "@/components/admin/admin-empty-state";
import { createCategory, deleteCategory, updateCategory } from "@/lib/categories/actions";
import { getAdminCategories, getCategoryProductCounts, type AdminCategoryRow } from "@/lib/categories/queries";
import { getAdminAccessState } from "@/lib/admin-access";
import { uploadProductMedia } from "@/lib/media/storage";
import { getSupabaseClient } from "@/lib/supabase-client";

type CategoryFormState = {
  name: string;
  slug: string;
  parent_id: string;
  image_url: string;
};

type CategoryFilterMode = "all" | "main" | "sub";

function SortIcon() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true" className="text-slate-300">
      <path d="M5 1 8 4H2L5 1Z" fill="currentColor" />
      <path d="M5 11 2 8h6l-3 3Z" fill="currentColor" />
    </svg>
  );
}

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

const EMPTY_FORM: CategoryFormState = {
  name: "",
  slug: "",
  parent_id: "",
  image_url: "",
};

export default function AdminCategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [categories, setCategories] = useState<AdminCategoryRow[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<CategoryFilterMode>("all");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadPage = async () => {
      const access = await getAdminAccessState(supabase);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasAdminAccess(access.hasAdminAccess);

      if (!access.userEmail || !access.hasAdminAccess) {
        setLoading(false);
        return;
      }

      const [categoryResult, countResult] = await Promise.all([getAdminCategories(), getCategoryProductCounts()]);

      if (!isMounted) {
        return;
      }

      if (categoryResult.error) {
        setErrorMessage(categoryResult.error.message);
        setCategories([]);
        setProductCounts({});
        setLoading(false);
        return;
      }

      if (countResult.error) {
        setErrorMessage(countResult.error.message);
      }

      setCategories(categoryResult.data);
      setProductCounts(countResult.data);
      setLoading(false);
    };

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

    return categories.filter((category) => {
      const matchesType =
        filterMode === "all" ||
        (filterMode === "main" ? !category.parent_id : Boolean(category.parent_id));

      const matchesSearch =
        query.length === 0 ||
        category.name.toLowerCase().includes(query) ||
        category.slug.toLowerCase().includes(query) ||
        (category.parent_id ? (categoryNameById.get(category.parent_id) ?? "").toLowerCase().includes(query) : false);

      return matchesType && matchesSearch;
    });
  }, [categories, filterMode, searchQuery]);

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const orderedCategories = useMemo(() => {
    const topLevel = categories
      .filter((category) => !category.parent_id)
      .sort((left, right) => left.name.localeCompare(right.name));

    return topLevel.flatMap((category) => [
      category,
      ...categories
        .filter((child) => child.parent_id === category.id)
        .sort((left, right) => left.name.localeCompare(right.name)),
    ]);
  }, [categories]);

  const parentOptions = useMemo(
    () =>
      categories
        .filter((category) => !editingCategoryId || category.id !== editingCategoryId)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [categories, editingCategoryId],
  );

  const visibleOrderedCategories = useMemo(
    () => orderedCategories.filter((category) => filteredCategories.some((entry) => entry.id === category.id)),
    [filteredCategories, orderedCategories],
  );

  const handleEdit = (category: AdminCategoryRow) => {
    setEditingCategoryId(category.id);
    setIsModalOpen(true);
    setForm({
      name: category.name,
      slug: category.slug,
      parent_id: category.parent_id ?? "",
      image_url: category.image_url ?? "",
    });
    setErrorMessage("");
    setSuccessMessage("");
  };

  const resetForm = () => {
    setEditingCategoryId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = form.name.trim();

    if (!trimmedName) {
      setErrorMessage("Category name is required.");
      setSuccessMessage("");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      name: trimmedName,
      slug: form.slug.trim() || toSlug(trimmedName),
      parent_id: form.parent_id || null,
      image_url: form.image_url.trim() || null,
    };

    const result = editingCategoryId
      ? await updateCategory(editingCategoryId, payload)
      : await createCategory(payload);

    if (result.error || !result.data) {
      setErrorMessage(result.error?.message ?? "Unable to save the category right now.");
      setIsSaving(false);
      return;
    }

    setCategories((current) => {
      if (editingCategoryId) {
        return current.map((category) => (category.id === editingCategoryId ? result.data! : category));
      }

      return [...current, result.data!].sort((left, right) => left.name.localeCompare(right.name));
    });
    setSuccessMessage(editingCategoryId ? "Category updated successfully." : "Category created successfully.");
    resetForm();
    setIsSaving(false);
  };

  const handleOpenCreateModal = () => {
    setEditingCategoryId(null);
    setForm(EMPTY_FORM);
    setErrorMessage("");
    setSuccessMessage("");
    setIsModalOpen(true);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setFilterMode("all");
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
        setErrorMessage(result.error?.message ?? "Unable to upload category image.");
        setIsUploadingImage(false);
        return;
      }

      setForm((current) => ({
        ...current,
        image_url: result.data!.publicUrl,
      }));
      setSuccessMessage("Category image uploaded successfully.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to upload category image.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDelete = async (category: AdminCategoryRow) => {
    setDeletingCategoryId(category.id);
    setErrorMessage("");
    setSuccessMessage("");

    const result = await deleteCategory(category.id);

    if (result.error) {
      setErrorMessage(result.error.message);
      setDeletingCategoryId(null);
      return;
    }

    setCategories((current) => current.filter((entry) => entry.id !== category.id));
    setProductCounts((current) => {
      const nextCounts = { ...current };
      delete nextCounts[category.id];
      return nextCounts;
    });

    if (editingCategoryId === category.id) {
      resetForm();
    }

    setSuccessMessage("Category deleted successfully.");
    setDeletingCategoryId(null);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading categories...
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Categories</h1>
        <p className="mt-3 text-sm text-slate-500">Please login as admin</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#615FFF] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Categories</h1>
        <p className="mt-3 text-sm text-slate-500">You do not have admin access</p>
      </div>
    );
  }

  return (
    <section className="w-full space-y-6">
      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-medium text-gray-800">Category List</h3>
            <p className="mt-1 text-sm text-gray-500">
              Review main categories and subcategories, manage slugs, and keep storefront navigation organized.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Add Category
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-[380px]">
            <label htmlFor="category-search" className="sr-only">
              Search categories
            </label>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              <SearchIcon />
            </span>
            <input
              id="category-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by category name or slug"
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-12 pr-4 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:w-56">
              <label htmlFor="category-filter" className="sr-only">
                Filter by category type
              </label>
              <select
                id="category-filter"
                value={filterMode}
                onChange={(event) => setFilterMode(event.target.value as CategoryFilterMode)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
              >
                <option value="all">All Categories</option>
                <option value="main">Main Categories</option>
                <option value="sub">Subcategories</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
            >
              Clear
            </button>
          </div>
        </div>

          {categories.length === 0 ? (
            <AdminEmptyState title="No categories yet" description="Create your first category to organize the product catalog." />
          ) : filteredCategories.length === 0 ? (
            <AdminEmptyState title="No matching categories" description="Try another search term." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 sm:px-6">
                      <div className="flex items-center gap-2">
                        <span>Name</span>
                        <SortIcon />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Image</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Products</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Slug</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Created At</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleOrderedCategories.map((category) => {
                    const linkedProductCount = productCounts[category.id] ?? 0;
                    const isDeleting = deletingCategoryId === category.id;
                    const parentName = category.parent_id ? categoryNameById.get(category.parent_id) ?? "Unknown parent" : null;

                    return (
                      <tr key={category.id}>
                        <td className="px-5 py-5 text-left sm:px-6">
                          <div className={`flex min-w-0 items-center gap-3 ${parentName ? "pl-8" : ""}`}>
                            <span
                              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${
                                parentName
                                  ? "border-slate-200 bg-slate-50 text-slate-400"
                                  : "border-[#465FFF]/20 bg-[#465FFF]/5 text-[#465FFF]"
                              }`}
                            >
                              {parentName ? "S" : "M"}
                            </span>
                            <div className={`min-w-0 ${parentName ? "border-l border-slate-200 pl-4" : ""}`}>
                              <p className="truncate text-sm font-medium text-slate-900">{category.name}</p>
                              <p className="truncate text-xs text-slate-500">{parentName ?? "Main category"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          {category.image_url ? (
                            <img
                              src={category.image_url}
                              alt={category.name}
                              className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-slate-200 text-xs text-slate-400">
                              N/A
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-5 text-sm font-medium text-slate-700">
                          {linkedProductCount > 0 ? `${linkedProductCount} product${linkedProductCount === 1 ? "" : "s"}` : "-"}
                        </td>
                        <td className="px-4 py-5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              parentName
                                ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
                                : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                            }`}
                          >
                            {parentName ? "Subcategory" : "Main"}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-sm text-slate-600">{category.slug}</td>
                        <td className="px-4 py-5 text-sm text-slate-600">{formatDate(category.created_at)}</td>
                        <td className="px-4 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(category)}
                              className="inline-flex items-center justify-center rounded-md bg-[#465FFF] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#3641f5]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(category)}
                              disabled={linkedProductCount > 0 || isDeleting}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Delete ${category.name}`}
                            >
                              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                                <path
                                  d="M5.833 7.5v7.083A1.417 1.417 0 007.25 16h5.5a1.417 1.417 0 001.417-1.417V7.5M8.333 9.583v4.167m3.334-4.167v4.167M4.167 5.417h11.666M8.75 3.75h2.5a.833.833 0 01.833.833v.834h-4.166v-.834A.833.833 0 018.75 3.75z"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
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
                <p className="text-sm font-semibold text-[#465FFF]">
                  {editingCategoryId ? "Edit Category" : "Add Category"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  {editingCategoryId ? "Update category details" : "Create a new catalog category"}
                </h2>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                aria-label="Close category modal"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form className="space-y-5 px-6 py-6" onSubmit={handleSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label htmlFor="category-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Category Name
                  </label>
                  <input
                    id="category-name"
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="e.g. Bags"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-sm outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
                  />
                </div>

                <div>
                  <label htmlFor="category-slug" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Slug
                  </label>
                  <input
                    id="category-slug"
                    type="text"
                    value={form.slug}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        slug: event.target.value,
                      }))
                    }
                    placeholder="Auto-generate from name"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-sm outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
                  />
                </div>

                <div>
                  <label htmlFor="category-parent" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Parent Category
                  </label>
                  <select
                    id="category-parent"
                    value={form.parent_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        parent_id: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-sm outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
                  >
                    <option value="">Main Category</option>
                    {parentOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="category-image-url" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Category Image
                  </label>
                  <input
                    id="category-image-url"
                    type="url"
                    value={form.image_url}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        image_url: event.target.value,
                      }))
                    }
                    placeholder="Paste uploaded image URL or upload below"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 shadow-sm outline-none transition-colors focus:border-[#615FFF]/40 focus:ring-4 focus:ring-[#615FFF]/10"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900">
                      {isUploadingImage ? "Uploading..." : "Upload Image"}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          void handleImageUpload(file);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <p className="text-xs text-slate-400">Uploaded image will be used on the homepage category circle.</p>
                  </div>
                  {form.image_url ? (
                    <div className="mt-4 flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="h-16 w-16 overflow-hidden rounded-full bg-white">
                        <img src={form.image_url} alt="Category preview" className="h-full w-full object-cover" />
                      </div>
                      <p className="min-w-0 break-all text-xs text-slate-500">{form.image_url}</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : editingCategoryId ? "Save Changes" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
