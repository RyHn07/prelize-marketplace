import type { Category } from "@/types/product";

function createCategoryImage(label: string, accent: string, soft: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420">
      <rect width="600" height="420" rx="32" fill="${soft}" />
      <rect x="42" y="42" width="516" height="336" rx="24" fill="#ffffff" />
      <circle cx="150" cy="155" r="62" fill="${accent}" fill-opacity="0.12" />
      <rect x="112" y="245" width="180" height="20" rx="10" fill="#dbe4f0" />
      <rect x="112" y="278" width="280" height="16" rx="8" fill="#e9eef5" />
      <text x="300" y="175" text-anchor="middle" fill="${accent}" font-family="Arial, sans-serif" font-size="42" font-weight="700">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const mockCategories: Category[] = [
  {
    id: "c-1",
    name: "Fashion",
    slug: "fashion",
    image: createCategoryImage("Fashion", "#615FFF", "#EEF2FF"),
    itemCount: "120+ items",
  },
  {
    id: "c-2",
    name: "Bags",
    slug: "bags",
    image: createCategoryImage("Bags", "#0F766E", "#ECFDF5"),
    itemCount: "85+ items",
  },
  {
    id: "c-3",
    name: "Shoes",
    slug: "shoes",
    image: createCategoryImage("Shoes", "#334155", "#F1F5F9"),
    itemCount: "96+ items",
  },
  {
    id: "c-4",
    name: "Beauty",
    slug: "beauty",
    image: createCategoryImage("Beauty", "#DB2777", "#FDF2F8"),
    itemCount: "110+ items",
  },
  {
    id: "c-5",
    name: "Electronics",
    slug: "electronics",
    image: createCategoryImage("Electronics", "#1D4ED8", "#EFF6FF"),
    itemCount: "140+ items",
  },
  {
    id: "c-6",
    name: "Home Decor",
    slug: "home-decor",
    image: createCategoryImage("Home", "#C2410C", "#FFF7ED"),
    itemCount: "72+ items",
  },
  {
    id: "c-7",
    name: "Accessories",
    slug: "accessories",
    image: createCategoryImage("Accessories", "#A16207", "#FEFCE8"),
    itemCount: "160+ items",
  },
  {
    id: "c-8",
    name: "Kids Items",
    slug: "kids-items",
    image: createCategoryImage("Kids", "#EA580C", "#FFF7ED"),
    itemCount: "68+ items",
  },
];
