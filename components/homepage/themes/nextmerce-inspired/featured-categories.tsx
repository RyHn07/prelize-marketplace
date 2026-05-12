"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import type { Category } from "@/types/product";

const SCROLL_STEP = 280;

function ArrowButton({
  direction,
  onClick,
}: {
  direction: "left" | "right";
  onClick: () => void;
}) {
  const isLeft = direction === "left";

  return (
    <button
      type="button"
      aria-label={isLeft ? "Scroll categories left" : "Scroll categories right"}
      onClick={onClick}
      className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        {isLeft ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
      </svg>
    </button>
  );
}

export default function FeaturedCategories({ categories }: { categories: Category[] }) {
  const railRef = useRef<HTMLDivElement | null>(null);

  if (categories.length === 0) {
    return null;
  }

  const scrollRail = (direction: "left" | "right") => {
    railRef.current?.scrollBy({
      left: direction === "left" ? -SCROLL_STEP : SCROLL_STEP,
      behavior: "smooth",
    });
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200 pb-10">
        <div className="flex items-start justify-between gap-6">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            Browse by Category
          </h2>

          <div className="hidden shrink-0 items-center gap-3 self-center sm:flex">
            <ArrowButton direction="left" onClick={() => scrollRail("left")} />
            <ArrowButton direction="right" onClick={() => scrollRail("right")} />
          </div>
        </div>

        <div
          ref={railRef}
          className="mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="group min-w-[150px] flex-1 snap-start text-center sm:min-w-[170px]"
            >
              <div className="mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-[#F3F5FB] transition-transform duration-300 group-hover:-translate-y-1 sm:h-36 sm:w-36">
                <div className="relative h-full w-full">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    sizes="144px"
                    className="object-cover"
                  />
                </div>
              </div>

              <h3 className="mt-5 text-lg font-medium tracking-tight text-[#1D2B5C] sm:text-[29px]/[1.15]">
                <span className="block text-base sm:text-[17px]">{category.name}</span>
              </h3>
            </Link>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-end gap-3 sm:hidden">
          <ArrowButton direction="left" onClick={() => scrollRail("left")} />
          <ArrowButton direction="right" onClick={() => scrollRail("right")} />
        </div>
      </div>
    </section>
  );
}
