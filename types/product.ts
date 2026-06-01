export type ProductBadge = "Hot" | "New" | "Best Value";

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface ProductReview {
  reviewer: string;
  comment: string;
  rating?: number;
  title?: string;
  createdAt?: string;
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
  description: string;
  specifications: ProductSpecification[];
  reviews?: ProductReview[];
  averageRating?: number;
  reviewCount?: number;
  buyerNotes: BuyerNote[];
  category: string;
  vendorName?: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  itemCount: string;
}
