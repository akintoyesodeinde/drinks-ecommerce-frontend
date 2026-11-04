import type { CartDto, CartItemDto, GuestCartItemSnapshot } from '../types/api';

const GUEST_CART_STORAGE_KEY = 'drinks_guest_cart_v1';

export function getGuestCartSnapshots(): GuestCartItemSnapshot[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GuestCartItemSnapshot[]) : [];
  } catch {
    return [];
  }
}

export function setGuestCartSnapshots(items: GuestCartItemSnapshot[]): void {
  try {
    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
}

export function clearGuestCart(): void {
  try {
    localStorage.removeItem(GUEST_CART_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function snapshotsToCartDto(snapshots: GuestCartItemSnapshot[]): CartDto {
  const items: CartItemDto[] = snapshots.map((snap) => ({
    id: snap.variantId,
    productId: snap.productId,
    productName: snap.productName,
    productSlug: snap.productSlug,
    variantId: snap.variantId,
    variantName: snap.variantName,
    sku: snap.sku,
    imageUrl: snap.imageUrl,
    unitPrice: snap.unitPrice,
    quantity: snap.quantity,
    lineTotal: snap.unitPrice * snap.quantity,
    availableQuantity: snap.availableQuantity,
    stockStatus: snap.stockStatus,
    isAvailable: snap.stockStatus !== 'OutOfStock' && snap.availableQuantity > 0,
  }));

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    id: 'guest-cart',
    items,
    itemCount,
    subtotal,
    discount: 0,
    couponCode: null,
    total: subtotal,
    warnings: [],
  };
}
