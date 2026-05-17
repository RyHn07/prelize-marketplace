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
    <section className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-8 lg:px-8 lg:py-14">
      <div className="border-b border-slate-200 pb-2 sm:pb-10">
        <div className="flex items-center justify-between gap-6">
          <h2 className="text-[14px] font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Browse by Category
          </h2>

          <Link
            href="/categories"
            className="shrink-0 text-[10px] font-medium text-[#615FFF] transition-colors hover:text-[#5552e6] sm:hidden"
          >
            Browse all
          </Link>

          <div className="hidden shrink-0 items-center gap-3 self-center sm:flex">
            <ArrowButton direction="left" onClick={() => scrollRail("left")} />
            <ArrowButton direction="right" onClick={() => scrollRail("right")} />
          </div>
        </div>

        <div
          ref={railRef}
          className="mt-4 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mt-10 sm:gap-6"
        >
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="group min-w-[96px] max-w-[96px] flex-none snap-start text-center sm:min-w-[170px] sm:max-w-none sm:flex-1"
            >
              <div className="mx-auto flex h-[82px] w-[82px] items-center justify-center overflow-hidden rounded-full bg-[#E9E9EC] transition-transform duration-300 group-hover:-translate-y-1 sm:h-36 sm:w-36 sm:bg-[#F3F5FB]">
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

              <h3 className="mt-3 text-[12px] font-medium leading-[1.35] tracking-tight text-[#121826] sm:mt-5 sm:text-[29px]/[1.15] sm:text-[#1D2B5C]">
                <span className="block sm:text-[17px]">{category.name}</span>
              </h3>
            </Link>
          ))}
        </div>

        <div className="mt-2 hidden items-center justify-end gap-3 sm:hidden">
          <ArrowButton direction="left" onClick={() => scrollRail("left")} />
          <ArrowButton direction="right" onClick={() => scrollRail("right")} />
        </div>
      </div>
    </section>
  );
}
