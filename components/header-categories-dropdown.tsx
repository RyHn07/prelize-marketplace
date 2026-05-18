"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type HeaderCategoryItem = {
  id: string;
  name: string;
  slug: string;
  children: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

function useCloseOnOutsideClick(isOpen: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return ref;
}

export function HeaderCategoriesDesktop({
  categories,
  triggerIcon,
  triggerChevron,
}: {
  categories: HeaderCategoryItem[];
  triggerIcon: ReactNode;
  triggerChevron: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useCloseOnOutsideClick(isOpen, () => setIsOpen(false));

  if (categories.length === 0) {
    return null;
  }

  return (
    <div ref={wrapperRef} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="hidden h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 lg:inline-flex"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {triggerIcon}
        <span>Categories</span>
        {triggerChevron}
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-50 mt-3 w-[min(96vw,980px)] rounded-[16px] border border-slate-200 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
          <div className="columns-3 gap-8">
            {categories.map((category) => (
              <div
                key={category.id}
                className={`mb-8 break-inside-avoid ${category.children.length > 0 ? "space-y-4" : ""}`}
              >
                <Link
                  href={`/categories/${category.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="block text-lg font-semibold text-slate-900 transition-colors hover:text-[#615FFF]"
                >
                  {category.name}
                </Link>

                {category.children.length > 0 ? (
                  <div className="space-y-3">
                    {category.children.slice(0, 4).map((child) => (
                      <Link
                        key={child.id}
                        href={`/categories/${category.slug}?subcategory=${child.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="block text-sm leading-6 text-slate-500 transition-colors hover:text-slate-900"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <Link
              href="/categories"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 transition-colors hover:text-[#615FFF]"
            >
              <span>See all categories</span>
              <span aria-hidden="true">›</span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function HeaderCategoriesMobile({
  categoriesLabel,
  categories,
  categoriesIcon,
  dropdownIcon,
}: {
  categoriesLabel: string;
  categories: HeaderCategoryItem[];
  categoriesIcon: ReactNode;
  dropdownIcon: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useCloseOnOutsideClick(isOpen, () => setIsOpen(false));

  if (categories.length === 0) {
    return null;
  }

  return (
    <div ref={wrapperRef} className="relative lg:hidden">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {categoriesIcon}
        <span>{categoriesLabel}</span>
        {dropdownIcon}
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-50 mt-3 w-[min(92vw,360px)] rounded-[16px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {categories.map((category) => (
              <div key={category.id} className="rounded-2xl border border-slate-200 p-4">
                <Link
                  href={`/categories/${category.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="block text-sm font-semibold text-slate-900"
                >
                  {category.name}
                </Link>
                {category.children.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {category.children.slice(0, 4).map((child) => (
                      <Link
                        key={child.id}
                        href={`/categories/${category.slug}?subcategory=${child.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="block text-xs leading-5 text-slate-500"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4">
            <Link
              href="/categories"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-900"
            >
              <span>See all categories</span>
              <span aria-hidden="true">›</span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
