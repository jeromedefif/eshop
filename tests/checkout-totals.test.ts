import { describe, it, expect } from 'vitest';
import { checkoutAccessoryTotals } from '@/lib/orders/checkout-totals';
import type { OrderConfirmationItem } from '@/types/orders';

const item = (id: number, volume: string, quantity: number, productCategory?: string): OrderConfirmationItem => ({ productId: id, productName: 'Test', volume, quantity, productCategory, display: '' });
describe('Checkout accessory totals', () => {
  it('always returns zeros for missing accessories', () => {
    expect(checkoutAccessoryTotals([item(1, '20', 3, 'Víno')])).toEqual({ petPackages: 0, gasPieces: 0 });
  });
  it('sums quantities across PET products and both gas sizes, excluding drinks', () => {
    expect(checkoutAccessoryTotals([item(1, 'baleni', 2, 'PET'), item(2, 'baleni', 1, 'PET'), item(3, 'maly', 2, 'Plyny'), item(3, 'velky', 3, 'Dusík'), item(4, '20', 9, 'Nápoje')])).toEqual({ petPackages: 3, gasPieces: 5 });
  });
  it('supports open legacy drafts with catalog categories or standard variant keys', () => {
    expect(checkoutAccessoryTotals([item(1, 'baleni', 3), item(2, 'velky', 2)])).toEqual({ petPackages: 3, gasPieces: 2 });
    expect(checkoutAccessoryTotals([item(1, 'custom', 4)], [{ id: 1, category: 'PET' }])).toEqual({ petPackages: 4, gasPieces: 0 });
  });
  it('keeps the draft category when the catalog has changed', () => {
    expect(checkoutAccessoryTotals([item(1, 'baleni', 2, 'PET')], [{ id: 1, category: 'Nápoje' }])).toEqual({ petPackages: 2, gasPieces: 0 });
  });
});
