import type { OrderConfirmationItem } from '@/types/orders';
import { normalizeProductCategory } from '@/lib/product-config';

type CategoryProduct = { id: string | number; category: string };

export function checkoutAccessoryTotals(items: OrderConfirmationItem[], products: CategoryProduct[] = []) {
  return items.reduce((totals, item) => {
    // Keep old, already open drafts working without changing their request key.
    const category = item.productCategory || products.find(product => String(product.id) === String(item.productId))?.category;
    const normalized = category ? normalizeProductCategory(category) : '';
    const volume = String(item.volume);
    if (normalized === 'PET' || (!normalized && volume === 'baleni')) totals.petPackages += item.quantity;
    if (normalized === 'Plyny' || (!normalized && ['maly', 'velky'].includes(volume))) totals.gasPieces += item.quantity;
    return totals;
  }, { petPackages: 0, gasPieces: 0 });
}
