import Image from "next/image";
import { notFound } from "next/navigation";

import Header from "@/components/Header";
import ProductCard from "@/components/product/product-card";
import ProductDetailsPurchasePanel from "@/components/product/product-details-purchase-panel";
import ProductDetailsTabs from "@/components/product/product-details-tabs";
import {
  getProductCategoryOptions,
  getPublicProductBySlug,
  getPublicProducts,
} from "@/lib/products/queries";
import { getCategoryById, mapProductDbToStorefrontProduct } from "@/lib/products/storefront";

type ProductDetailsPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailsPage({ params }: ProductDetailsPageProps) {
  const { slug } = await params;
  const [{ data: categoryOptions }, { data: productRow }, { data: publicProducts }] = await Promise.all([
    getProductCategoryOptions(),
    getPublicProductBySlug(slug),
    getPublicProducts(),
  ]);

  if (!productRow) {
    notFound();
  }

  const product = mapProductDbToStorefrontProduct(productRow, categoryOptions);
  const category = getCategoryById(productRow.category_id, categoryOptions);
  const relatedProducts = publicProducts
    .filter((item) => item.category_id === productRow.category_id && item.slug !== productRow.slug)
    .slice(0, 4)
    .map((item) => mapProductDbToStorefrontProduct(item, categoryOptions));

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Home</span>
            <span>&gt;</span>
            <span>Categories</span>
            <span>&gt;</span>
            <span>{category?.name ?? "Catalog"}</span>
            <span>&gt;</span>
            <span className="font-medium text-slate-700">{product.name}</span>
          </nav>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.95fr_0.8fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-lg bg-slate-100">
              <div className="relative aspect-square">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(min-width: 1280px) 36vw, 100vw"
                  className="object-cover"
                />
              </div>
            </div>

            <div className="flex gap-3">
              {product.gallery.slice(0, 3).map((image, index) => (
                <div
                  key={`${product.id}-gallery-${index}`}
                  className="overflow-hidden rounded-md bg-slate-100"
                >
                  <Image
                    src={image}
                    alt={`${product.name} thumbnail ${index + 1}`}
                    width={96}
                    height={96}
                    className="h-20 w-20 object-cover sm:h-24 sm:w-24"
                  />
                </div>
              ))}
            </div>
          </div>

          <ProductDetailsPurchasePanel product={product} />
        </div>

        <ProductDetailsTabs product={product} />

        {relatedProducts.length > 0 ? (
          <section className="mt-10 space-y-5">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Related Products
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Similar wholesale products you can source from the same category.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} product={relatedProduct} />
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
