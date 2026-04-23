export type ProductBadge = "Hot" | "New" | "Best Value";

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface BuyerNote {
  title: string;
  description: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  image: string;
  gallery: string[];
  priceFrom: number;
  moq: string;
  weight: string;
  badge?: ProductBadge;
  shortDescription: string;
  description: string;
  specifications: ProductSpecification[];
  buyerNotes: BuyerNote[];
  category: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  itemCount: string;
}
