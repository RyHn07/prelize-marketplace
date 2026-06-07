import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import Header from "@/components/Header";
import { getProductCategoryOptions, getPublicProducts } from "@/lib/products/queries";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Browse Categories",
  description:
    "Explore Prelize marketplace categories including fashion, agriculture, automotive, business, packaging, construction, and more wholesale product groups.",
  path: "/categories",
});

function createSlugFallback(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export default async function CategoriesPage() {
  const [{ data: categoryOptions, error: categoryError }, { data: publicProducts, error: productError }] =
    await Promise.all([getProductCategoryOptions(), getPublicProducts()]);

  const countByCategoryId = new Map<string, number>();
  const imageByCategoryId = new Map<string, string>();
  const childrenByParentId = new Map<string, typeof categoryOptions>();

  for (const product of publicProducts) {
    if (!product.category_id) {
      continue;
    }

    countByCategoryId.set(product.category_id, (countByCategoryId.get(product.category_id) ?? 0) + 1);

    if (!imageByCategoryId.has(product.category_id) && typeof product.image_url === "string" && product.image_url.trim()) {
      imageByCategoryId.set(product.category_id, product.image_url);
    }
  }

  for (const category of categoryOptions) {
    if (!category.parent_id) {
      continue;
    }

    const current = childrenByParentId.get(category.parent_id) ?? [];
    current.push(category);
    childrenByParentId.set(category.parent_id, current);
  }

  const categories = categoryOptions
    .filter((category) => !category.parent_id)
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug ?? createSlugFallback(category.name),
      image:
        (typeof category.image_url === "string" && category.image_url.trim() ? category.image_url : null) ??
        imageByCategoryId.get(category.id) ??
        "/file.svg",
      totalItems:
        (countByCategoryId.get(category.id) ?? 0) +
        (childrenByParentId.get(category.id) ?? []).reduce(
          (sum, child) => sum + (countByCategoryId.get(child.id) ?? 0),
          0,
        ),
      totalGroups: 1 + (childrenByParentId.get(category.id) ?? []).length,
      children: (childrenByParentId.get(category.id) ?? [])
        .map((child) => ({
          id: child.id,
          name: child.name,
          slug: child.slug ?? createSlugFallback(child.name),
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    }))
    .sort((left, right) => right.totalItems - left.totalItems || left.name.localeCompare(right.name));

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-8">
          <h1 className="text-[14px] font-semibold tracking-tight text-slate-900 sm:text-3xl">
            All Category
          </h1>
          <div className="mt-4 h-px w-full bg-slate-200" />

          {categoryError || productError ? (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              We could not load some category data from Supabase. Showing currently available results only.
            </div>
          ) : null}
        </div>

        <div className="columns-1 gap-8 md:columns-2 xl:columns-3">
          {categories.map((category) => (
            <section key={category.id} className="mb-8 break-inside-avoid">
                <Link
                  href={`/categories/${category.slug}`}
                  className="group flex items-center gap-4 rounded-[16px] transition-colors"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      sizes="64px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900 transition-colors group-hover:text-[#615FFF]">
                      {category.name}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-[#615FFF]">
                      {category.totalGroups} total categories · {category.totalItems} products
                    </p>
                  </div>
                </Link>

                {category.children.length > 0 ? (
                  <div className="mt-4 space-y-3 pl-20">
                    {category.children.map((child) => (
                      <Link
                        key={child.id}
                        href={`/categories/${category.slug}?subcategory=${child.slug}`}
                        className="block text-sm leading-6 text-slate-500 transition-colors hover:text-slate-900"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                ) : null}
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
