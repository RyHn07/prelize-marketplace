export const WISHLIST_STORAGE_KEY = "prelize-wishlist";
export const WISHLIST_UPDATED_EVENT = "prelize:wishlist-updated";

function canUseBrowserStorage() {
  return typeof window !== "undefined";
}

export function getWishlistIds() {
  if (!canUseBrowserStorage()) {
    return [] as string[];
  }

  const storedValue = window.localStorage.getItem(WISHLIST_STORAGE_KEY);

  if (!storedValue) {
    return [] as string[];
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue) ? parsedValue.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [] as string[];
  }
}

export function saveWishlistIds(ids: string[]) {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(WISHLIST_UPDATED_EVENT, { detail: ids }));
}

export function isProductInWishlist(productId: string) {
  return getWishlistIds().includes(productId);
}

export function toggleWishlistProduct(productId: string) {
  const currentIds = getWishlistIds();
  const nextIds = currentIds.includes(productId)
    ? currentIds.filter((id) => id !== productId)
    : [...currentIds, productId];

  saveWishlistIds(nextIds);

  return nextIds;
}
