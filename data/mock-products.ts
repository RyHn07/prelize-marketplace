import type { Product } from "@/types/product";

function createProductImage(label: string, accent: string, soft: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
      <rect width="800" height="800" rx="48" fill="${soft}" />
      <rect x="70" y="70" width="660" height="660" rx="38" fill="#ffffff" />
      <rect x="120" y="120" width="560" height="340" rx="30" fill="${soft}" />
      <circle cx="240" cy="275" r="78" fill="${accent}" fill-opacity="0.12" />
      <circle cx="555" cy="220" r="52" fill="${accent}" fill-opacity="0.18" />
      <rect x="145" y="500" width="300" height="28" rx="14" fill="#dbe4f0" />
      <rect x="145" y="548" width="420" height="24" rx="12" fill="#e8eef6" />
      <rect x="145" y="594" width="220" height="24" rx="12" fill="#e8eef6" />
      <text x="400" y="325" text-anchor="middle" fill="${accent}" font-family="Arial, sans-serif" font-size="48" font-weight="700">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createGallery(label: string) {
  return [
    createProductImage(label, "#615FFF", "#EEF2FF"),
    createProductImage(`${label} A`, "#0F766E", "#ECFDF5"),
    createProductImage(`${label} B`, "#C2410C", "#FFF7ED"),
  ];
}

export const mockProducts: Product[] = [
  {
    id: "p-1",
    slug: "women-knit-cardigan-set",
    name: "Women Knit Cardigan Set for Boutique and Wholesale Resellers",
    image: createProductImage("Cardigan", "#615FFF", "#EEF2FF"),
    gallery: createGallery("Cardigan"),
    priceFrom: 120,
    moq: "10 pcs",
    weight: "0.5 kg",
    badge: "Hot",
    shortDescription:
      "Soft-touch cardigan set with export-ready finishing for fashion wholesalers.",
    description:
      "This knit cardigan set is designed for wholesale buyers looking for reliable quality, stable sizing, and repeat-friendly colors. It is suitable for online resellers, boutique stores, and seasonal fashion campaigns.",
    specifications: [
      { label: "Material", value: "Cotton blend knit" },
      { label: "Sizes", value: "S, M, L, XL" },
      { label: "Color Options", value: "6 mixed wholesale colors" },
      { label: "Packing", value: "Individual polybag, 20 pcs per carton" },
    ],
    buyerNotes: [
      {
        title: "Wholesale shipping note",
        description:
          "China domestic delivery is arranged first, then Bangladesh air or sea shipment is confirmed after order review.",
      },
      {
        title: "MOQ reminder",
        description:
          "Minimum quantity starts at bulk level to keep sourcing and freight efficient for import buyers.",
      },
    ],
    category: "fashion",
  },
  {
    id: "p-2",
    slug: "pu-leather-crossbody-bag",
    name: "PU Leather Crossbody Bag with Premium Hardware Finish",
    image: createProductImage("Bag", "#0F766E", "#ECFDF5"),
    gallery: createGallery("Bag"),
    priceFrom: 180,
    moq: "12 pcs",
    weight: "0.7 kg",
    badge: "New",
    shortDescription:
      "Modern ladies bag line with clean stitching and reseller-friendly price range.",
    description:
      "A practical wholesale bag option for fashion importers in Bangladesh. The structure, finishing, and hardware are selected to support repeat orders in retail and online channels.",
    specifications: [
      { label: "Outer Material", value: "PU leather" },
      { label: "Inner Lining", value: "Soft polyester lining" },
      { label: "Compartments", value: "2 main sections, 1 zipper pocket" },
      { label: "Packing", value: "Dust bag plus export carton" },
    ],
    buyerNotes: [
      {
        title: "Freight estimate",
        description:
          "Checkout shows an estimated freight amount only. Final cost depends on packed volume and selected route.",
      },
      {
        title: "Recommended shipment",
        description:
          "Air works for faster restocking. Sea is better for larger consolidated bag orders.",
      },
    ],
    category: "bags",
  },
  {
    id: "p-3",
    slug: "chunky-casual-sneakers",
    name: "Chunky Casual Sneakers for Men and Women Wholesale Orders",
    image: createProductImage("Shoes", "#334155", "#F1F5F9"),
    gallery: createGallery("Shoes"),
    priceFrom: 260,
    moq: "8 pairs",
    weight: "0.9 kg",
    badge: "Hot",
    shortDescription:
      "Streetwear-inspired sneakers with stable quality for high-volume resellers.",
    description:
      "Built for wholesalers who need trend-driven footwear with practical sizing coverage. This sneaker line is suitable for mixed color assortment buying and bulk restocking.",
    specifications: [
      { label: "Upper", value: "Synthetic mesh and PU" },
      { label: "Outsole", value: "Rubber sole" },
      { label: "Size Range", value: "39 to 44" },
      { label: "Carton Ratio", value: "8 pairs assorted sizes" },
    ],
    buyerNotes: [
      {
        title: "Order handling",
        description:
          "Shoes are packed by size ratio. Final freight is recalculated after carton weight confirmation.",
      },
      {
        title: "Import planning",
        description:
          "For wholesale footwear, mixed sea consolidation is often more cost-efficient than small air shipments.",
      },
    ],
    category: "shoes",
  },
  {
    id: "p-4",
    slug: "hydrating-skin-care-set",
    name: "Hydrating Skin Care Gift Set for Beauty Shop Wholesale Supply",
    image: createProductImage("Beauty", "#DB2777", "#FDF2F8"),
    gallery: createGallery("Beauty"),
    priceFrom: 145,
    moq: "24 sets",
    weight: "0.6 kg",
    badge: "New",
    shortDescription:
      "Retail-ready beauty bundle with gift-box style presentation and clean packaging.",
    description:
      "A wholesale beauty set designed for gift campaigns, beauty resellers, and social commerce shops. Packaging is tidy and presentable for both display and parcel resale.",
    specifications: [
      { label: "Items Included", value: "Cleanser, serum, cream, mask" },
      { label: "Shelf Life", value: "24 months" },
      { label: "Packaging", value: "Printed gift box" },
      { label: "Compliance", value: "Supplier export documents available" },
    ],
    buyerNotes: [
      {
        title: "Buyer caution",
        description:
          "Product registration or import compliance checks may vary by product type and destination regulations.",
      },
      {
        title: "Shipping note",
        description:
          "Liquid and cream items may need route confirmation before final Bangladesh freight approval.",
      },
    ],
    category: "beauty",
  },
  {
    id: "p-5",
    slug: "wireless-earbuds-pro",
    name: "Wireless Earbuds Pro with Charging Case for Gadget Resellers",
    image: createProductImage("Audio", "#1D4ED8", "#EFF6FF"),
    gallery: createGallery("Audio"),
    priceFrom: 320,
    moq: "20 pcs",
    weight: "0.25 kg",
    shortDescription:
      "Compact electronics item for wholesale gadget stores and online resellers.",
    description:
      "This earbuds model focuses on value pricing, stable packaging, and broad mass-market demand. It works well for accessory stores, gadget pages, and mixed electronics containers.",
    specifications: [
      { label: "Battery", value: "300mAh case battery" },
      { label: "Connection", value: "Bluetooth 5.3" },
      { label: "Charging", value: "Type-C" },
      { label: "Box Size", value: "Retail-ready compact box" },
    ],
    buyerNotes: [
      {
        title: "Shipment planning",
        description:
          "Electronics freight and customs handling can vary. Final rate is confirmed after cargo review.",
      },
      {
        title: "Bulk buying",
        description:
          "For mixed accessory orders, buyers often combine this item with small electronics to optimize shipping weight.",
      },
    ],
    category: "electronics",
  },
  {
    id: "p-6",
    slug: "minimal-led-table-lamp",
    name: "Minimal LED Table Lamp for Home Decor and Lifestyle Stores",
    image: createProductImage("Lamp", "#C2410C", "#FFF7ED"),
    gallery: createGallery("Lamp"),
    priceFrom: 410,
    moq: "6 pcs",
    weight: "1.1 kg",
    badge: "Best Value",
    shortDescription:
      "Decor-focused table lamp with clean design for home and gift retailers.",
    description:
      "A balanced home decor product for wholesale buyers who need modern styling with practical carton efficiency. The lamp suits showroom display, ecommerce, and gift resellers.",
    specifications: [
      { label: "Body Material", value: "Metal and acrylic" },
      { label: "Light Source", value: "Integrated LED" },
      { label: "Power", value: "USB powered" },
      { label: "Packing", value: "Foam secured export box" },
    ],
    buyerNotes: [
      {
        title: "Shipping caution",
        description:
          "Fragile items should be consolidated carefully. Final Bangladesh shipment cost depends on packing volume.",
      },
      {
        title: "Reseller tip",
        description:
          "This item performs well in home decor bundles and festive campaign sourcing.",
      },
    ],
    category: "home-decor",
  },
  {
    id: "p-7",
    slug: "stainless-steel-water-bottle",
    name: "Stainless Steel Water Bottle with Matte Finish and Gift Box",
    image: createProductImage("Bottle", "#0F766E", "#F0FDFA"),
    gallery: createGallery("Bottle"),
    priceFrom: 95,
    moq: "30 pcs",
    weight: "0.4 kg",
    shortDescription:
      "Utility product with strong repeat-buy potential for accessories and lifestyle shops.",
    description:
      "A practical wholesale bottle product with simple branding potential and solid carton economics. Suitable for corporate gifting, ecommerce bundles, and daily essentials stores.",
    specifications: [
      { label: "Capacity", value: "750 ml" },
      { label: "Material", value: "304 stainless steel" },
      { label: "Finish", value: "Powder-coated matte body" },
      { label: "Packing", value: "Single gift box" },
    ],
    buyerNotes: [
      {
        title: "MOQ note",
        description:
          "Low unit value items work best when ordered in larger consolidated quantities.",
      },
      {
        title: "Freight note",
        description:
          "Checkout estimate is provisional and based on average packed weight per carton.",
      },
    ],
    category: "accessories",
  },
  {
    id: "p-8",
    slug: "kids-cartoon-backpack",
    name: "Kids Cartoon Backpack for School and Gift Wholesale Supply",
    image: createProductImage("Kids", "#EA580C", "#FFF7ED"),
    gallery: createGallery("Kids"),
    priceFrom: 135,
    moq: "15 pcs",
    weight: "0.45 kg",
    badge: "Hot",
    shortDescription:
      "Colorful backpack line for kids stores, seasonal campaigns, and gift sellers.",
    description:
      "This backpack is designed for bulk retail demand with attractive character styling, stable fabric quality, and clean stitching. Good for school season sourcing and gift packs.",
    specifications: [
      { label: "Fabric", value: "Water-resistant polyester" },
      { label: "Compartments", value: "Main compartment and front zipper" },
      { label: "Target Group", value: "Kids age 4 to 9" },
      { label: "Packing", value: "12 to 15 pcs per export bale" },
    ],
    buyerNotes: [
      {
        title: "Seasonal demand",
        description:
          "Back-to-school season can affect supplier lead time, so larger pre-booking is recommended.",
      },
      {
        title: "Shipping mode",
        description:
          "Soft goods are often efficient for mixed sea cargo when ordered in higher volume.",
      },
    ],
    category: "kids-items",
  },
  {
    id: "p-9",
    slug: "gold-plated-layered-necklace",
    name: "Gold Plated Layered Necklace Set for Fashion Accessory Stores",
    image: createProductImage("Jewelry", "#A16207", "#FEFCE8"),
    gallery: createGallery("Jewelry"),
    priceFrom: 70,
    moq: "50 pcs",
    weight: "0.1 kg",
    shortDescription:
      "Fast-moving fashion accessory suitable for low-weight wholesale import orders.",
    description:
      "A lightweight jewelry product that supports high margin resale and easy mixed sourcing. It is a popular pick for live sellers, small boutiques, and gift-focused accessory stores.",
    specifications: [
      { label: "Material", value: "Alloy with gold-tone plating" },
      { label: "Finish", value: "Gloss polished" },
      { label: "Style", value: "3-layer fashion necklace set" },
      { label: "Packing", value: "Card backing and polybag" },
    ],
    buyerNotes: [
      {
        title: "Packing tip",
        description:
          "Accessory items are ideal for combining with apparel or bags to improve shipment value per kg.",
      },
      {
        title: "Estimate note",
        description:
          "Displayed checkout freight is approximate. Packed chargeable weight is checked before final confirmation.",
      },
    ],
    category: "accessories",
  },
  {
    id: "p-10",
    slug: "portable-blender-cup",
    name: "Portable Blender Cup for Home and Kitchen Retail Distribution",
    image: createProductImage("Blender", "#7C3AED", "#F5F3FF"),
    gallery: createGallery("Blender"),
    priceFrom: 360,
    moq: "10 pcs",
    weight: "0.85 kg",
    badge: "New",
    shortDescription:
      "Compact blender cup with retail packaging for home gadget stores.",
    description:
      "A convenient home product aimed at gadget shops and kitchen resellers. It combines trending lifestyle appeal with manageable carton size for wholesale shipments.",
    specifications: [
      { label: "Capacity", value: "420 ml" },
      { label: "Power", value: "USB rechargeable motor" },
      { label: "Blade", value: "Stainless steel blade set" },
      { label: "Packing", value: "Color retail box" },
    ],
    buyerNotes: [
      {
        title: "Route note",
        description:
          "Small motorized items may require route approval before shipment confirmation.",
      },
      {
        title: "Buyer planning",
        description:
          "This item is often sourced together with bottles and kitchen accessories for mixed home shipments.",
      },
    ],
    category: "home-decor",
  },
  {
    id: "p-11",
    slug: "smart-watch-active-series",
    name: "Smart Watch Active Series for Electronics and Lifestyle Retail",
    image: createProductImage("Watch", "#0F172A", "#F8FAFC"),
    gallery: createGallery("Watch"),
    priceFrom: 520,
    moq: "10 pcs",
    weight: "0.2 kg",
    shortDescription:
      "Value-focused smartwatch line with broad mass-market demand.",
    description:
      "Suitable for gadget resellers who need a competitive entry-level smartwatch with clean presentation and practical feature coverage. It fits both retail shelf and ecommerce channels.",
    specifications: [
      { label: "Display", value: "1.83 inch touch display" },
      { label: "Battery", value: "5 to 7 days average use" },
      { label: "Compatibility", value: "Android and iOS" },
      { label: "Packing", value: "Retail box with charger" },
    ],
    buyerNotes: [
      {
        title: "Pricing note",
        description:
          "Starting price reflects base sourcing rate before final freight and handling charges.",
      },
      {
        title: "Import note",
        description:
          "Final delivery cost is approved after cargo weight, route, and consolidation details are finalized.",
      },
    ],
    category: "electronics",
  },
  {
    id: "p-12",
    slug: "decorative-wall-mirror-set",
    name: "Decorative Wall Mirror Set for Home Decor Retail Projects",
    image: createProductImage("Mirror", "#BE123C", "#FFF1F2"),
    gallery: createGallery("Mirror"),
    priceFrom: 290,
    moq: "8 sets",
    weight: "1.4 kg",
    badge: "Best Value",
    shortDescription:
      "Statement decor set for interior accessories and premium home retailers.",
    description:
      "A decorative mirror set intended for curated home decor assortment buying. This style works well for showroom display, online catalogs, and gift-oriented home collections.",
    specifications: [
      { label: "Material", value: "Glass mirror with composite backing" },
      { label: "Set Size", value: "3 decorative mirror pieces" },
      { label: "Use Case", value: "Wall decor and interior styling" },
      { label: "Packing", value: "Protective foam and export carton" },
    ],
    buyerNotes: [
      {
        title: "Fragile cargo note",
        description:
          "Breakable items require reinforced packing. Final shipment cost is validated after packing confirmation.",
      },
      {
        title: "Wholesale tip",
        description:
          "Combine with other home decor products to optimize overall container value.",
      },
    ],
    category: "home-decor",
  },
  {
    id: "p-13",
    slug: "travel-organizer-pouch-set",
    name: "Travel Organizer Pouch Set for Bags and Lifestyle Retailers",
    image: createProductImage("Pouch", "#0F766E", "#ECFDF5"),
    gallery: createGallery("Pouch"),
    priceFrom: 110,
    moq: "20 sets",
    weight: "0.3 kg",
    badge: "New",
    shortDescription:
      "Compact organizer set for travel stores, gift shops, and ecommerce bundles.",
    description:
      "This organizer pouch set is a practical wholesale item for lifestyle retailers. It is lightweight, easy to combine with other travel goods, and suitable for repeat seasonal sourcing.",
    specifications: [
      { label: "Material", value: "Water-resistant nylon" },
      { label: "Set Contents", value: "6 assorted organizer pieces" },
      { label: "Use Case", value: "Travel packing and storage" },
      { label: "Packing", value: "Printed polybag set packing" },
    ],
    buyerNotes: [
      {
        title: "Bulk planning",
        description:
          "Low-weight textile items are ideal for combining with fashion and accessory shipments.",
      },
      {
        title: "Freight estimate",
        description:
          "Final freight is based on packed weight after consolidation and route selection.",
      },
    ],
    category: "bags",
  },
  {
    id: "p-14",
    slug: "mens-oxford-shirt-pack",
    name: "Mens Oxford Shirt Pack for Corporate and Retail Wholesale Supply",
    image: createProductImage("Shirt", "#615FFF", "#EEF2FF"),
    gallery: createGallery("Shirt"),
    priceFrom: 210,
    moq: "15 pcs",
    weight: "0.55 kg",
    shortDescription:
      "Reliable shirt line for menswear stores, corporate supply, and uniform sourcing.",
    description:
      "This oxford shirt pack is built for wholesale orders requiring dependable stitching, size consistency, and practical color options. It suits boutiques and businesswear retailers.",
    specifications: [
      { label: "Fabric", value: "Cotton polyester blend" },
      { label: "Sizes", value: "M, L, XL, XXL" },
      { label: "Colors", value: "White, blue, charcoal" },
      { label: "Packing", value: "Folded with collar support" },
    ],
    buyerNotes: [
      {
        title: "Order note",
        description:
          "Apparel sizes can be assorted per carton ratio based on wholesale quantity.",
      },
      {
        title: "Shipping note",
        description:
          "Final Bangladesh freight is approved after packed volume is confirmed.",
      },
    ],
    category: "fashion",
  },
  {
    id: "p-15",
    slug: "mini-bluetooth-speaker",
    name: "Mini Bluetooth Speaker for Electronics and Gift Product Resellers",
    image: createProductImage("Speaker", "#1D4ED8", "#EFF6FF"),
    gallery: createGallery("Speaker"),
    priceFrom: 275,
    moq: "18 pcs",
    weight: "0.35 kg",
    badge: "Hot",
    shortDescription:
      "Portable speaker line with broad retail demand and compact carton sizing.",
    description:
      "A lightweight electronics option for gadget sellers and gift stores. This speaker is suitable for mixed electronics sourcing and value-focused retail campaigns.",
    specifications: [
      { label: "Connection", value: "Bluetooth 5.1" },
      { label: "Battery", value: "1200mAh rechargeable battery" },
      { label: "Playback", value: "4 to 6 hours average use" },
      { label: "Packing", value: "Color box retail packaging" },
    ],
    buyerNotes: [
      {
        title: "Route approval",
        description:
          "Battery items may require route confirmation before final shipment dispatch.",
      },
      {
        title: "Retail tip",
        description:
          "This product performs well when grouped with earbuds and chargers.",
      },
    ],
    category: "electronics",
  },
  {
    id: "p-16",
    slug: "ceramic-coffee-mug-set",
    name: "Ceramic Coffee Mug Set for Homeware and Gift Wholesale Orders",
    image: createProductImage("Mugs", "#C2410C", "#FFF7ED"),
    gallery: createGallery("Mugs"),
    priceFrom: 165,
    moq: "16 sets",
    weight: "1.2 kg",
    shortDescription:
      "Giftable mug set with practical packaging for home and decor retailers.",
    description:
      "This ceramic mug set offers a simple but strong homeware wholesale option for retail stores, gifting campaigns, and decor-focused online sellers.",
    specifications: [
      { label: "Material", value: "Glazed ceramic" },
      { label: "Set Size", value: "2 mugs per set" },
      { label: "Finish", value: "Gloss printed surface" },
      { label: "Packing", value: "Protective gift box" },
    ],
    buyerNotes: [
      {
        title: "Packing note",
        description:
          "Breakable homeware needs reinforced packing before international freight confirmation.",
      },
      {
        title: "Freight note",
        description:
          "Sea shipping is often preferred for larger homeware quantities.",
      },
    ],
    category: "home-decor",
  },
  {
    id: "p-17",
    slug: "makeup-brush-kit-pro",
    name: "Makeup Brush Kit Pro for Beauty Wholesale and Gift Set Packaging",
    image: createProductImage("Brushes", "#DB2777", "#FDF2F8"),
    gallery: createGallery("Brushes"),
    priceFrom: 130,
    moq: "25 sets",
    weight: "0.28 kg",
    badge: "Best Value",
    shortDescription:
      "Beauty accessory kit for ecommerce bundles, gift boxes, and salon supply.",
    description:
      "This brush kit is a compact beauty item for wholesale buyers who want a practical and margin-friendly accessory line. It works well for cosmetics pages and resale bundles.",
    specifications: [
      { label: "Brush Count", value: "10-piece set" },
      { label: "Handle Material", value: "Wood finish handle" },
      { label: "Fiber", value: "Soft synthetic bristles" },
      { label: "Packing", value: "Pouch plus retail sleeve" },
    ],
    buyerNotes: [
      {
        title: "Best use",
        description:
          "Ideal for combining with skincare, beauty sets, and gift-focused retail orders.",
      },
      {
        title: "Shipping estimate",
        description:
          "Displayed shipping is only estimated until final packed quantity is confirmed.",
      },
    ],
    category: "beauty",
  },
  {
    id: "p-18",
    slug: "mens-slip-on-loafers",
    name: "Mens Slip On Loafers for Casual Footwear Wholesale Distribution",
    image: createProductImage("Loafers", "#334155", "#F1F5F9"),
    gallery: createGallery("Loafers"),
    priceFrom: 240,
    moq: "10 pairs",
    weight: "0.8 kg",
    shortDescription:
      "Easy-selling footwear line for casual fashion stores and mixed shoe containers.",
    description:
      "These loafers are designed for buyers who need affordable casual footwear with reliable shape, practical sizing, and broad mass-market appeal.",
    specifications: [
      { label: "Upper", value: "PU leather upper" },
      { label: "Outsole", value: "Flexible rubber sole" },
      { label: "Sizes", value: "40 to 44" },
      { label: "Packing", value: "Pair box with carton packing" },
    ],
    buyerNotes: [
      {
        title: "Container planning",
        description:
          "Footwear is best ordered with stable size ratios for easier retail allocation.",
      },
      {
        title: "Shipping note",
        description:
          "Final freight depends on carton count, packed size, and chosen route.",
      },
    ],
    category: "shoes",
  },
  {
    id: "p-19",
    slug: "girls-hair-accessory-pack",
    name: "Girls Hair Accessory Pack for Kids Retail and Gift Wholesale",
    image: createProductImage("Hair", "#EA580C", "#FFF7ED"),
    gallery: createGallery("Hair"),
    priceFrom: 60,
    moq: "40 packs",
    weight: "0.12 kg",
    shortDescription:
      "Lightweight kids accessory line with strong retail pack appeal.",
    description:
      "A low-weight, high-volume kids accessory product that works well for gift shops, variety stores, and online bundle sellers focused on affordable retail pricing.",
    specifications: [
      { label: "Items", value: "Clips, ties, bands mixed pack" },
      { label: "Target Use", value: "Kids fashion accessory resale" },
      { label: "Colors", value: "Mixed assorted colors" },
      { label: "Packing", value: "Carded retail pack" },
    ],
    buyerNotes: [
      {
        title: "Low-weight benefit",
        description:
          "Accessory products are easy to combine with apparel and gifting lines for better freight efficiency.",
      },
      {
        title: "Wholesale note",
        description:
          "Best ordered in higher quantities to optimize shipment value.",
      },
    ],
    category: "kids-items",
  },
  {
    id: "p-20",
    slug: "women-satin-scarf-pack",
    name: "Women Satin Scarf Pack for Fashion Accessories and Reseller Supply",
    image: createProductImage("Scarf", "#A16207", "#FEFCE8"),
    gallery: createGallery("Scarf"),
    priceFrom: 85,
    moq: "30 pcs",
    weight: "0.18 kg",
    shortDescription:
      "Elegant scarf line for boutique, live selling, and gift accessory sourcing.",
    description:
      "This satin scarf pack supports affordable wholesale buying with a polished look and easy display value. It is suitable for boutiques, online resellers, and mixed accessory shipments.",
    specifications: [
      { label: "Fabric", value: "Soft satin polyester" },
      { label: "Dimensions", value: "70cm x 70cm" },
      { label: "Style", value: "Printed assorted patterns" },
      { label: "Packing", value: "Folded single polybag" },
    ],
    buyerNotes: [
      {
        title: "Reseller tip",
        description:
          "This item works well for gift bundles, boutique displays, and seasonal promo orders.",
      },
      {
        title: "Freight note",
        description:
          "Final freight remains estimated until export packing and shipment route are confirmed.",
      },
    ],
    category: "accessories",
  },
];

export function getProductBySlug(slug: string) {
  return mockProducts.find((product) => product.slug === slug);
}
