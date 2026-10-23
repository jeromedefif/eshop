import { describe, it, expect, vi } from 'vitest';
import { draftKey, parseDraft, type OrderDraft } from '@/lib/orders/draft';
import { prepareOrderDraft, orderDataFromCart } from '@/lib/orders/prepare-draft';
import { CheckoutSubmissionError, submitCheckoutDraft } from '@/lib/orders/submit-checkout';
import type { Product } from '@/types/database';

const makeStorage = () => {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } } as Storage;
};
const draft = (): OrderDraft => ({ userId: 'alice', requestKey: crypto.randomUUID(), createdAt: Date.now(), items: [{ productId: 1, productName: 'Víno', productCategory: 'Víno', volume: '3', quantity: 2, display: '3L × 2' }], totalVolume: 6, customer: { name: 'Alice', email: 'alice@example.invalid', phone: '', shippingAddress: 'Sklad 1', note: 'Zavolejte' } });

describe('Quick and regular checkout share safe submission', () => {
  it('writes the retry key before sending, stores a receipt and preserves the note', async () => {
    const storage = makeStorage(), original = draft();
    const send = vi.fn(async (_url, init) => {
      expect(parseDraft(storage.getItem(draftKey('alice')), 'alice')).toMatchObject({ attempted: true, requestKey: original.requestKey });
      expect(JSON.parse(init!.body as string)).toMatchObject({ userId: 'alice', requestKey: original.requestKey, note: 'Zavolejte', expectedCustomer: original.customer });
      return Response.json({ orderId: 'accepted-1' }, { status: 201 });
    }) as typeof fetch;
    const completed = await submitCheckoutDraft(original, storage, () => true, send);
    expect(completed.completedOrderId).toBe('accepted-1');
    expect(parseDraft(storage.getItem(draftKey('alice')), 'alice')?.completedOrderId).toBe('accepted-1');
  });
  it('retains an uncertain request and retries with exactly the same key and contents', async () => {
    const storage = makeStorage(), original = draft();
    await expect(submitCheckoutDraft(original, storage, () => true, vi.fn().mockRejectedValue(new TypeError('offline')))).rejects.toBeInstanceOf(CheckoutSubmissionError);
    const pending = parseDraft(storage.getItem(draftKey('alice')), 'alice')!;
    const changed = { ...original, items: [{ ...original.items[0], quantity: 9 }] };
    expect(prepareOrderDraft(storage, 'alice', changed)).toEqual(pending);
    const send = vi.fn().mockResolvedValue(Response.json({ orderId: 'accepted-1' }));
    await submitCheckoutDraft(pending, storage, () => true, send);
    expect(JSON.parse(send.mock.calls[0][1].body).requestKey).toBe(original.requestKey);
  });
  it('shows changed delivery data without silently resubmitting', async () => {
    const storage = makeStorage(), original = draft();
    const send = vi.fn().mockResolvedValue(Response.json({ code: 'CUSTOMER_CHANGED', error: 'Údaje se změnily', customer: { ...original.customer, shippingAddress: 'Nový sklad' } }, { status: 409 }));
    await expect(submitCheckoutDraft(original, storage, () => true, send)).rejects.toMatchObject({ draft: { attempted: false, customer: { shippingAddress: 'Nový sklad', note: 'Zavolejte' } } });
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('does not submit when draft storage fails or the account changes', async () => {
    const send = vi.fn();
    const storage = makeStorage();
    storage.setItem = () => { throw new Error('storage unavailable'); };
    await expect(submitCheckoutDraft(draft(), storage, () => true, send)).rejects.toThrow();
    await expect(submitCheckoutDraft(draft(), makeStorage(), () => false, send)).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
  it('never reports an accepted order as failed when receipt persistence fails', async () => {
    const storage = makeStorage(); let writes = 0;
    const originalSet = storage.setItem;
    storage.setItem = (key, value) => { if (++writes > 1) throw new Error('quota'); originalSet(key, value); };
    await expect(submitCheckoutDraft(draft(), storage, () => true, vi.fn().mockResolvedValue(Response.json({ orderId: 'accepted' })))).resolves.toMatchObject({ completedOrderId: 'accepted' });
  });
  it('uses a new key only after a completed order, retaining pending drafts per account', () => {
    const storage = makeStorage(), original = draft();
    const first = prepareOrderDraft(storage, 'alice', original);
    expect(prepareOrderDraft(storage, 'alice', original).requestKey).toBe(first.requestKey);
    storage.setItem(draftKey('alice'), JSON.stringify({ ...first, completedOrderId: 'accepted' }));
    expect(prepareOrderDraft(storage, 'alice', original).requestKey).not.toBe(first.requestKey);
    expect(prepareOrderDraft(storage, 'bob', original).userId).toBe('bob');
  });
  it('counts PET and gas separately and refuses to omit unavailable catalog lines', () => {
    const products: Product[] = ['Víno', 'PET', 'Plyny'].map((category, index) => ({ id: String(index + 1), name: category, category, in_stock: true, is_archived: false, is_new: false, is_featured: false, sort_priority: 0, min_order_qty: 1, allowed_volumes: [], product_color: null, sweetness: null }));
    const data = orderDataFromCart({ '1-3': 2, '2-baleni': 3, '3-maly': 1 }, products, draft().customer);
    expect(data.totalVolume).toBe(6);
    expect(data.items).toHaveLength(3);
    expect(() => orderDataFromCart({ '99-3': 1 }, products, draft().customer)).toThrow('Některá položka');
  });
});
