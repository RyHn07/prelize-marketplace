import Link from "next/link";

import AdminPageHeader from "@/components/admin/admin-page-header";

const cards = [
  {
    title: "Themes",
    description: "Create, preview, duplicate, and activate homepage layouts.",
    href: "/admin/homepage/themes",
  },
  {
    title: "Content Blocks",
    description: "Edit hero copy, proof sections, testimonials, and CTA text.",
    href: "/admin/homepage/content",
  },
  {
    title: "Promo Banners",
    description: "Manage active banners, date windows, and placements.",
    href: "/admin/homepage/banners",
  },
  {
    title: "Product Sections",
    description: "Control dynamic homepage product sources and product rules.",
    href: "/admin/homepage/product-sections",
  },
];

export default function AdminHomepagePage() {
  return (
    <section className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Homepage"
        title="Homepage Theme Engine"
        description="Control layout and dynamic homepage content separately, then preview and activate any theme at any time."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:border-[#615FFF]/30">
            <h2 className="text-xl font-semibold text-slate-900">{card.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">{card.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
