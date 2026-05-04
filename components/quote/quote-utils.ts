export type QuoteItem = {
  productId: string;
  name: string;
  image: string;
  productSlug?: string | null;
  variation: string;
  variantId?: string | null;
  variantName?: string | null;
  variantValue?: string | null;
  price: number;
  quantity: number;
};

export const QUOTE_STORAGE_KEY = "prelize_quote";
export const QUOTE_UPDATED_EVENT = "prelize-quote-updated";

function canUseBrowserStorage() {
  return typeof window !== "undefined";
}

function isQuoteItem(value: unknown): value is QuoteItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.productId === "string" &&
    typeof item.name === "string" &&
    typeof item.image === "string" &&
    (item.productSlug === undefined || item.productSlug === null || typeof item.productSlug === "string") &&
    typeof item.variation === "string" &&
    (item.variantId === undefined || item.variantId === null || typeof item.variantId === "string") &&
    (item.variantName === undefined || item.variantName === null || typeof item.variantName === "string") &&
    (item.variantValue === undefined || item.variantValue === null || typeof item.variantValue === "string") &&
    typeof item.price === "number" &&
    Number.isFinite(item.price) &&
    typeof item.quantity === "number" &&
    Number.isFinite(item.quantity)
  );
}

export function getQuoteItemKey(productId: string, variation: string, variantId?: string | null) {
  return variantId && variantId.trim().length > 0 ? `${productId}::${variantId}` : `${productId}::${variation}`;
}

function readQuoteItems() {
  if (!canUseBrowserStorage()) {
    return [] as QuoteItem[];
  }

  const storedValue = window.localStorage.getItem(QUOTE_STORAGE_KEY);

  if (!storedValue) {
    return [] as QuoteItem[];
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [] as QuoteItem[];
    }

    return parsedValue
      .filter(isQuoteItem)
      .map((item) => ({
        ...item,
        productSlug: item.productSlug ?? null,
        variantId: item.variantId ?? null,
        variantName: item.variantName ?? null,
        variantValue: item.variantValue ?? null,
        quantity: Math.max(0, Math.floor(item.quantity)),
      }))
      .filter((item) => item.quantity > 0);
  } catch {
    return [] as QuoteItem[];
  }
}

function saveQuoteItems(items: QuoteItem[]) {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(QUOTE_UPDATED_EVENT, { detail: items }));
}

export function getQuoteItems() {
  return readQuoteItems();
}

export function addToQuote(item: QuoteItem) {
  const nextItem: QuoteItem = {
    ...item,
    quantity: Math.max(1, Math.floor(item.quantity)),
  };

  const items = getQuoteItems();
  const existingItemIndex = items.findIndex(
    (quoteItem) =>
      getQuoteItemKey(quoteItem.productId, quoteItem.variation, quoteItem.variantId) ===
      getQuoteItemKey(nextItem.productId, nextItem.variation, nextItem.variantId),
  );

  if (existingItemIndex >= 0) {
    items[existingItemIndex] = {
      ...items[existingItemIndex],
      quantity: items[existingItemIndex].quantity + nextItem.quantity,
    };
  } else {
    items.push(nextItem);
  }

  saveQuoteItems(items);

  return items;
}

export function updateQuoteItem(productId: string, variation: string, quantity: number, variantId?: string | null) {
  const nextQuantity = Math.max(0, Math.floor(quantity));
  const items = getQuoteItems();
  const targetKey = getQuoteItemKey(productId, variation, variantId);

  const nextItems =
    nextQuantity === 0
      ? items.filter((item) => getQuoteItemKey(item.productId, item.variation, item.variantId) !== targetKey)
      : items.map((item) =>
          getQuoteItemKey(item.productId, item.variation, item.variantId) === targetKey
            ? { ...item, quantity: nextQuantity }
            : item,
        );

  saveQuoteItems(nextItems);

  return nextItems;
}

export function removeQuoteItem(productId: string, variation: string, variantId?: string | null) {
  const targetKey = getQuoteItemKey(productId, variation, variantId);
  const nextItems = getQuoteItems().filter(
    (item) => getQuoteItemKey(item.productId, item.variation, item.variantId) !== targetKey,
  );

  saveQuoteItems(nextItems);

  return nextItems;
}

export function clearQuote() {
  saveQuoteItems([]);

  return [] as QuoteItem[];
}

export function getQuoteCount() {
  return getQuoteItems().reduce((total, item) => total + item.quantity, 0);
}

export function getQuoteTotal() {
  return getQuoteItems().reduce((total, item) => total + item.price * item.quantity, 0);
}
