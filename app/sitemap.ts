import type { MetadataRoute } from "next";

import { getProductCategoryOptions, getPublicProducts } from "@/lib/products/queries";
import { absoluteUrl } from "@/lib/seo";
import { getVendors } from "@/lib/vendors/queries";

const staticRoutes: MetadataRoute.Sitemap = [
  {
    url: absoluteUrl("/"),
    changeFrequency: "daily",
    priority: 1,
  },
  {
    url: absoluteUrl("/products"),
    changeFrequency: "daily",
    priority: 0.95,
  },
  {
    url: absoluteUrl("/categories"),
    changeFrequency: "weekly",
    priority: 0.9,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ data: products }, { data: categories }, { data: vendors }] = await Promise.all([
    getPublicProducts(),
    getProductCategoryOptions(),
    getVendors(),
  ]);

  const categoryRoutes: MetadataRoute.Sitemap = categories
    .filter((category) => Boolean(category.slug))
    .map((category) => ({
      url: absoluteUrl(`/categories/${category.slug}`),
      changeFrequency: "weekly",
      priority: category.parent_id ? 0.72 : 0.82,
      images: category.image_url ? [category.image_url] : undefined,
    }));

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => {
    const images = [
      product.image_url,
      ...(Array.isArray(product.gallery_images) ? product.gallery_images : []),
    ].filter((image): image is string => typeof image === "string" && image.trim().length > 0);

    return {
      url: absoluteUrl(`/products/${product.slug}`),
      lastModified: product.created_at ?? undefined,
      changeFrequency: "weekly",
      priority: 0.86,
      images: images.length > 0 ? Array.from(new Set(images)) : undefined,
    } satisfies MetadataRoute.Sitemap[number];
  });

  const vendorRoutes: MetadataRoute.Sitemap = vendors
    .filter((vendor) => vendor.status === "active")
    .map((vendor) => ({
      url: absoluteUrl(`/vendors/${vendor.slug}`),
      changeFrequency: "weekly",
      priority: 0.74,
      images: vendor.logo_url ? [vendor.logo_url] : undefined,
    }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...vendorRoutes];
}
