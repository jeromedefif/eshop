import type { CartItems, OrderConfirmationItem } from '@/types/orders';

// Keep lines added or edited while the request was in flight.
export function removeOrderedLines(cart: CartItems, items: Pick<OrderConfirmationItem, 'productId' | 'volume' | 'quantity'>[]): CartItems {
  const next = { ...cart };
  for (const item of items) {
    const key = `${item.productId}-${item.volume}`;
    if (next[key] === item.quantity) delete next[key];
  }
  return next;
}
