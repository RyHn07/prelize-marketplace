import Image from "next/image";
import Link from "next/link";

import type { Category } from "@/types/product";

interface CategoryCardProps {
  category: Category;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]"
    >
      <div className="aspect-[16/10] overflow-hidden bg-slate-50">
        <Image
          src={category.image}
          alt={category.name}
          width={600}
          height={420}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>

      <div className="space-y-2 p-5">
        <h2 className="text-lg font-semibold text-slate-900">{category.name}</h2>
        <p className="text-sm text-slate-500">{category.itemCount}</p>
      </div>
    </Link>
  );
}
