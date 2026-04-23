import Image from "next/image";
import { notFound } from "next/navigation";

import Header from "@/components/Header";
import ProductCard from "@/components/product/product-card";
import ProductDetailsPurchasePanel from "@/components/product/product-details-purchase-panel";
import ProductDetailsTabs from "@/components/product/product-details-tabs";
import { getProductBySlug, mockProducts } from "@/data/mock-products";

type ProductDetailsPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailsPage({ params }: ProductDetailsPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = mockProducts
    .filter((item) => item.category === product.category && item.slug !== product.slug)
    .slice(0, 4);

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
      </section>
    </main>
  );
}
