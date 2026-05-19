"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type ProductImageGalleryProps = {
  productId: string;
  productName: string;
  mainImage: string;
  galleryImages: string[];
};

const VISIBLE_THUMBNAILS = 4;

function chunkImages(images: string[], size: number) {
  const chunks: string[][] = [];

  for (let index = 0; index < images.length; index += size) {
    chunks.push(images.slice(index, index + size));
  }

  return chunks;
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      {direction === "left" ? (
        <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export default function ProductImageGallery({
  productId,
  productName,
  mainImage,
  galleryImages,
}: ProductImageGalleryProps) {
  const images = useMemo(() => {
    const uniqueImages = [mainImage, ...galleryImages].filter(
      (image, index, allImages): image is string => Boolean(image) && allImages.indexOf(image) === index,
    );

    return uniqueImages.length > 0 ? uniqueImages : [mainImage];
  }, [galleryImages, mainImage]);
  const [activeImage, setActiveImage] = useState(images[0] ?? mainImage);
  const [thumbnailPage, setThumbnailPage] = useState(0);
  const thumbnailPages = useMemo(() => chunkImages(images, VISIBLE_THUMBNAILS), [images]);

  useEffect(() => {
    setActiveImage((current) => (images.includes(current) ? current : images[0] ?? mainImage));
  }, [images, mainImage]);

  useEffect(() => {
    const activeIndex = Math.max(0, images.indexOf(activeImage));
    const nextPage = Math.floor(activeIndex / VISIBLE_THUMBNAILS);

    setThumbnailPage((current) => {
      const maxPage = Math.max(0, thumbnailPages.length - 1);
      const normalizedCurrent = Math.min(current, maxPage);

      return nextPage === normalizedCurrent ? normalizedCurrent : nextPage;
    });
  }, [activeImage, images, thumbnailPages.length]);

  useEffect(() => {
    setThumbnailPage((current) => Math.min(current, Math.max(0, thumbnailPages.length - 1)));
  }, [thumbnailPages.length]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleExternalImageSelection = (event: Event) => {
      const customEvent = event as CustomEvent<{ imageUrl?: string }>;
      const nextImage = customEvent.detail?.imageUrl;

      if (typeof nextImage !== "string" || !images.includes(nextImage)) {
        return;
      }

      setActiveImage(nextImage);
    };

    window.addEventListener("prelize:set-storefront-product-image", handleExternalImageSelection as EventListener);

    return () => {
      window.removeEventListener("prelize:set-storefront-product-image", handleExternalImageSelection as EventListener);
    };
  }, [images]);

  const canScrollLeft = thumbnailPage > 0;
  const canScrollRight = thumbnailPage < thumbnailPages.length - 1;
  const showFloatingArrows = images.length > VISIBLE_THUMBNAILS;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg bg-slate-100">
        <div className="relative aspect-square">
          <Image
            src={activeImage}
            alt={productName}
            fill
            sizes="(min-width: 1280px) 36vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>

      <div className="relative">
        {showFloatingArrows ? (
          <>
            <button
              type="button"
              onClick={() => setThumbnailPage((current) => Math.max(0, current - 1))}
              disabled={!canScrollLeft}
              className="absolute left-0 top-1/2 z-10 inline-flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-lg backdrop-blur transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Show previous gallery images"
            >
              <ChevronIcon direction="left" />
            </button>

            <button
              type="button"
              onClick={() => setThumbnailPage((current) => Math.min(thumbnailPages.length - 1, current + 1))}
              disabled={!canScrollRight}
              className="absolute right-0 top-1/2 z-10 inline-flex h-11 w-11 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-lg backdrop-blur transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Show more gallery images"
            >
              <ChevronIcon direction="right" />
            </button>
          </>
        ) : null}

        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${thumbnailPage * 100}%)` }}
          >
            {thumbnailPages.map((pageImages, pageIndex) => (
              <div
                key={`${productId}-gallery-page-${pageIndex}`}
                className="flex min-w-full items-center justify-start gap-3"
              >
                {pageImages.map((image, index) => {
                  const absoluteIndex = pageIndex * VISIBLE_THUMBNAILS + index;
                  const isActive = image === activeImage;

                  return (
                    <button
                      key={`${productId}-gallery-${absoluteIndex}`}
                      type="button"
                      onClick={() => setActiveImage(image)}
                      className={`relative overflow-hidden rounded-md border bg-slate-100 transition-all ${
                        isActive ? "border-[#615FFF] ring-2 ring-[#615FFF]/20" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`${productName} thumbnail ${absoluteIndex + 1}`}
                        width={96}
                        height={96}
                        className="h-20 w-20 object-cover sm:h-24 sm:w-24"
                      />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
