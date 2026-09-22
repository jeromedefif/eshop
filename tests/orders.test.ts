import { describe, it, expect } from 'vitest';
import { parseOrderRequest, validateOrderItems, orderFingerprint } from '@/lib/orders/validation';
import { parseDraft, sameDraftContents } from '@/lib/orders/draft';
const key = '11111111-1111-4111-8111-111111111111';
const product = { id: 1n, name: 'Víno', category: 'Víno', in_stock: true, is_archived: false, min_order_qty: 2, allowed_volumes: [] };
const item = { productId: '1', quantity: 2, volume: '10' };
describe('Order trust boundary', () => {
  it('rejects empty, fractional, negative and duplicate items', () => {
    for (const items of [[], [{ ...item, quantity: 0 }], [{ ...item, quantity: 1.5 }], [item, item]]) {
      expect(() => parseOrderRequest({ requestKey: key, items })).toThrow();
    }
  });
  it('rejects missing, archived, unavailable products, forbidden volume and below minimum', () => {
    for (const products of [[], [{ ...product, is_archived: true }], [{ ...product, in_stock: false }]]) expect(() => validateOrderItems([item], products)).toThrow();
    expect(() => validateOrderItems([{ ...item, volume: '999' }], [product])).toThrow();
    expect(() => validateOrderItems([{ ...item, quantity: 1 }], [product])).toThrow();
  });
  it('calculates liters on server, ignores submitted totals and captures product identity', () => {
    const input = parseOrderRequest({ requestKey: key, items: [item], totalVolume: 999999 });
    expect(validateOrderItems(input.items, [product])).toMatchObject({ totalVolume: 20, records: [{ product_name: 'Víno', product_category: 'Víno' }] });
    expect(validateOrderItems([{ ...item, volume: 'baleni' }], [{ ...product, category: 'PET' }]).totalVolume).toBe(0);
  });
  it('fingerprints equivalent reordered payloads consistently, detects changed contents', () => {
    const second = { ...item, productId: '2' };
    const a = parseOrderRequest({ requestKey: key, items: [item, second] });
    const b = parseOrderRequest({ requestKey: key, items: [second, item] });
    expect(orderFingerprint(a)).toBe(orderFingerprint(b));
    expect(orderFingerprint(a)).not.toBe(orderFingerprint({ ...a, note: 'changed' }));
  });
});
describe('Draft account isolation', () => {
  const now = 100000000;
  const draft = JSON.stringify({ userId: 'alice', requestKey: key, createdAt: now, items: [item], totalVolume: 20, customer: { name: 'Alice', email: 'alice@example.invalid', phone: '', note: '' } });
  it('never loads another account draft', () => expect(parseDraft(draft, 'bob', now)).toBeNull());
  it('rejects expired and unowned legacy drafts', () => {
    expect(parseDraft(draft, 'alice', now + 86400001)).toBeNull();
    expect(parseDraft(JSON.stringify({ items: [item] }), 'alice', now)).toBeNull();
  });
  it('preserves the key when retrying the same draft', () => expect(parseDraft(draft, 'alice', now)?.requestKey).toBe(key));
  it('recognizes an unchanged order when navigating back after an uncertain response', () => {
    const parsed = parseDraft(draft, 'alice', now)!;
    expect(sameDraftContents(parsed, { ...parsed, totalVolume: 999 })).toBe(true);
    expect(sameDraftContents(parsed, { ...parsed, customer: { ...parsed.customer, note: 'changed' } })).toBe(false);
  });
});
