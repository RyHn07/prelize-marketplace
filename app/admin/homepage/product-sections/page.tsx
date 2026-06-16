"use client";

import { useEffect, useState } from "react";

import AdminPageHeader from "@/components/admin/admin-page-header";
import { getAdminAccessState } from "@/lib/admin-access";
import {
  createHomepageProductSectionRequest,
  deleteHomepageProductSectionRequest,
  fetchHomepageProductSections,
  updateHomepageProductSectionRequest,
} from "@/lib/homepage/actions";
import { getProductCategoryOptions, getProducts } from "@/lib/products/queries";
import { getPgDataClient } from "@/lib/browser-app-client";
import type {
  HomepageProductSectionRow,
  HomepageProductSectionSourceType,
  ProductCategoryOption,
  ProductDbRow,
} from "@/types/product-db";

type EditableSection = HomepageProductSectionRow & {
  product_ids_text: string;
};

export default function HomepageProductSectionsPage() {
  const [loading, setLoading] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sections, setSections] = useState<EditableSection[]>([]);
  const [categories, setCategories] = useState<ProductCategoryOption[]>([]);
  const [products, setProducts] = useState<ProductDbRow[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [newSection, setNewSection] = useState<{
    title: string;
    subtitle: string;
    section_key: string;
    source_type: HomepageProductSectionSourceType;
    category_id: string;
    product_ids_text: string;
    limit_count: number;
    sort_order: number;
    is_active: boolean;
  }>({
    title: "",
    subtitle: "",
    section_key: "",
    source_type: "newest",
    category_id: "",
    product_ids_text: "",
    limit_count: 8,
    sort_order: 0,
    is_active: true,
  });

  const loadSections = async () => {
    try {
      const result = await fetchHomepageProductSections();
      setSections(
        (result.sections ?? []).map((section: HomepageProductSectionRow) => ({
          ...section,
          product_ids_text: section.product_ids.join(", "),
        })),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load homepage product sections.");
    }
  };

  useEffect(() => {
    let isMounted = true;
    const dataClient = getPgDataClient();

    const loadPage = async () => {
      const access = await getAdminAccessState(dataClient);

      if (!isMounted) {
        return;
      }

      setUserEmail(access.userEmail);
      setHasAdminAccess(access.hasAdminAccess);

      if (!access.userEmail || !access.hasAdminAccess) {
        setLoading(false);
        return;
      }

      const [categoryResult, productResult] = await Promise.all([
        getProductCategoryOptions(),
        getProducts(),
      ]);

      if (!isMounted) {
        return;
      }

      setCategories(categoryResult.data);
      setProducts(productResult.data);
      await loadSections();
      setLoading(false);
    };

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const saveSection = async (section: EditableSection) => {
    try {
      await updateHomepageProductSectionRequest(section.id, {
        title: section.title,
        subtitle: section.subtitle,
        section_key: section.section_key,
        source_type: section.source_type,
        category_id: section.category_id,
        product_ids: section.product_ids_text.split(",").map((entry) => entry.trim()).filter(Boolean),
        limit_count: section.limit_count,
        sort_order: section.sort_order,
        is_active: section.is_active,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save homepage product section.");
      return;
    }

    await loadSections();
  };

  const createSection = async () => {
    try {
      await createHomepageProductSectionRequest({
        ...newSection,
        subtitle: newSection.subtitle || null,
        category_id: newSection.category_id || null,
        product_ids: newSection.product_ids_text.split(",").map((entry) => entry.trim()).filter(Boolean),
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create homepage product section.");
      return;
    }

    setNewSection({
      title: "",
      subtitle: "",
      section_key: "",
      source_type: "newest",
      category_id: "",
      product_ids_text: "",
      limit_count: 8,
      sort_order: 0,
      is_active: true,
    });
    await loadSections();
  };

  const deleteSection = async (id: string) => {
    try {
      await deleteHomepageProductSectionRequest(id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete homepage product section.");
      return;
    }

    await loadSections();
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Loading homepage product sections...</div>;
  }

  if (!userEmail) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Please login as admin.</div>;
  }

  if (!hasAdminAccess) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">You do not have admin access.</div>;
  }

  return (
    <section className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Homepage"
        title="Homepage Product Sections"
        description="Control whether each homepage strip is manual, category-driven, newest, featured, or low-MOQ focused."
      />

      {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{errorMessage}</div> : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Create Product Section</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <input value={newSection.title} onChange={(event) => setNewSection((current) => ({ ...current, title: event.target.value }))} placeholder="Title" className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
          <input value={newSection.section_key} onChange={(event) => setNewSection((current) => ({ ...current, section_key: event.target.value }))} placeholder="Section key" className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
          <input value={newSection.subtitle} onChange={(event) => setNewSection((current) => ({ ...current, subtitle: event.target.value }))} placeholder="Subtitle" className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF] md:col-span-2" />
          <select value={newSection.source_type} onChange={(event) => setNewSection((current) => ({ ...current, source_type: event.target.value as HomepageProductSectionSourceType }))} className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]">
            <option value="manual">Manual</option>
            <option value="newest">Newest</option>
            <option value="featured">Featured</option>
            <option value="category">Category</option>
            <option value="low_moq">Low MOQ</option>
          </select>
          <select value={newSection.category_id} onChange={(event) => setNewSection((current) => ({ ...current, category_id: event.target.value }))} className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]">
            <option value="">Select category</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <input type="number" value={newSection.limit_count} onChange={(event) => setNewSection((current) => ({ ...current, limit_count: Number(event.target.value) || 8 }))} placeholder="Limit count" className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
          <input type="number" value={newSection.sort_order} onChange={(event) => setNewSection((current) => ({ ...current, sort_order: Number(event.target.value) || 0 }))} placeholder="Sort order" className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
          <textarea value={newSection.product_ids_text} onChange={(event) => setNewSection((current) => ({ ...current, product_ids_text: event.target.value }))} placeholder={`Manual product IDs (comma separated)\nExample: ${products[0]?.id ?? ""}`} className="min-h-24 rounded-xl border border-slate-300 px-3 py-3 font-mono text-xs outline-none focus:border-[#615FFF] md:col-span-2" />
        </div>
        <button type="button" onClick={() => void createSection()} className="mt-5 rounded-xl bg-[#615FFF] px-5 py-3 text-sm font-semibold text-white hover:opacity-90">
          Add Product Section
        </button>
      </div>

      <div className="space-y-5">
        {sections.map((section) => (
          <div key={section.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <input value={section.title} onChange={(event) => setSections((current) => current.map((entry) => entry.id === section.id ? { ...entry, title: event.target.value } : entry))} className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
              <input value={section.section_key} onChange={(event) => setSections((current) => current.map((entry) => entry.id === section.id ? { ...entry, section_key: event.target.value } : entry))} className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
              <input value={section.subtitle ?? ""} onChange={(event) => setSections((current) => current.map((entry) => entry.id === section.id ? { ...entry, subtitle: event.target.value || null } : entry))} className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF] md:col-span-2" />
              <select value={section.source_type} onChange={(event) => setSections((current) => current.map((entry) => entry.id === section.id ? { ...entry, source_type: event.target.value as EditableSection["source_type"] } : entry))} className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]">
                <option value="manual">Manual</option>
                <option value="newest">Newest</option>
                <option value="featured">Featured</option>
                <option value="category">Category</option>
                <option value="low_moq">Low MOQ</option>
              </select>
              <select value={section.category_id ?? ""} onChange={(event) => setSections((current) => current.map((entry) => entry.id === section.id ? { ...entry, category_id: event.target.value || null } : entry))} className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]">
                <option value="">Select category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              <input type="number" value={section.limit_count} onChange={(event) => setSections((current) => current.map((entry) => entry.id === section.id ? { ...entry, limit_count: Number(event.target.value) || 8 } : entry))} className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
              <input type="number" value={section.sort_order} onChange={(event) => setSections((current) => current.map((entry) => entry.id === section.id ? { ...entry, sort_order: Number(event.target.value) || 0 } : entry))} className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#615FFF]" />
              <textarea value={section.product_ids_text} onChange={(event) => setSections((current) => current.map((entry) => entry.id === section.id ? { ...entry, product_ids_text: event.target.value } : entry))} className="min-h-24 rounded-xl border border-slate-300 px-3 py-3 font-mono text-xs outline-none focus:border-[#615FFF] md:col-span-2" />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => void saveSection(section)} className="rounded-xl bg-[#615FFF] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Save</button>
              <button type="button" onClick={() => void deleteSection(section.id)} className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
