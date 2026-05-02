"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";

import { createCategory, deleteCategory, updateCategory } from "@/lib/categories/actions";
import { getAdminCategories, getCategoryProductCounts, type AdminCategoryRow } from "@/lib/categories/queries";
import { getAdminAccessState } from "@/lib/admin-access";
import { getSupabaseClient } from "@/lib/supabase-client";

type CategoryFormState = {
  name: string;
  slug: string;
};

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
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

    return categories.filter((category) => {
      if (query.length === 0) {
        return true;
      }

      return (
        category.name.toLowerCase().includes(query) ||
        category.slug.toLowerCase().includes(query)
      );
    });
  }, [categories, searchQuery]);

  const assignedCategoriesCount = useMemo(
    () => categories.filter((category) => (productCounts[category.id] ?? 0) > 0).length,
    [categories, productCounts],
  );

  const unassignedCategoriesCount = categories.length - assignedCategoriesCount;

  const handleEdit = (category: AdminCategoryRow) => {
    setEditingCategoryId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
    });
    setErrorMessage("");
    setSuccessMessage("");
  };

  const resetForm = () => {
    setEditingCategoryId(null);
    setForm(EMPTY_FORM);
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
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#615FFF]">Admin Dashboard</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500">Manage the shared catalog categories used across the marketplace.</p>
        </div>

        <Link
          href="/admin/products"
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
        >
          View Products
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Total Categories</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{categories.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-emerald-500">Assigned</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{assignedCategoriesCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Unassigned</p>
          <p className="mt-2 text-2xl font-semibold text-slate-700">{unassignedCategoriesCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Attached Products</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {Object.values(productCounts).reduce((sum, count) => sum + count, 0)}
          </p>
        </div>
      </div>

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

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.4fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">
              {editingCategoryId ? "Edit Category" : "Create Category"}
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              {editingCategoryId ? "Update category details" : "Add a new catalog category"}
            </h2>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
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
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
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
                placeholder="Leave blank to auto-generate from name"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
              />
              <p className="mt-2 text-xs text-slate-400">Only letters, numbers, and hyphens will be kept.</p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-2xl bg-[#615FFF] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : editingCategoryId ? "Save Changes" : "Create Category"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#615FFF]">Category List</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Current categories</h2>
            </div>

            <div className="w-full lg:w-72">
              <label htmlFor="category-search" className="sr-only">
                Search categories
              </label>
              <input
                id="category-search"
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by category name or slug"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors focus:border-[#615FFF]"
              />
            </div>
          </div>

          {categories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <h3 className="text-lg font-semibold text-slate-900">No categories yet</h3>
              <p className="mt-2 text-sm text-slate-500">Create your first category to organize the product catalog.</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <h3 className="text-lg font-semibold text-slate-900">No matching categories</h3>
              <p className="mt-2 text-sm text-slate-500">Try another search term.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCategories.map((category) => {
                const linkedProductCount = productCounts[category.id] ?? 0;
                const isDeleting = deletingCategoryId === category.id;

                return (
                  <article
                    key={category.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Name</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{category.name}</p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Slug</p>
                          <p className="mt-1 break-all text-sm text-slate-600">{category.slug}</p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Assigned Products</p>
                          <p className="mt-1 text-sm font-medium text-slate-700">{linkedProductCount}</p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Created</p>
                          <p className="mt-1 text-sm font-medium text-slate-700">{formatDate(category.created_at)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        <button
                          type="button"
                          onClick={() => handleEdit(category)}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-[#615FFF]/40 hover:text-slate-900"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(category)}
                          disabled={linkedProductCount > 0 || isDeleting}
                          className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
