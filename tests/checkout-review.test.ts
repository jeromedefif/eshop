import { describe, it, expect } from 'vitest';
import { customerFromProfile, sameCustomer } from '@/lib/orders/customer';
import { removeOrderedLines } from '@/lib/orders/checkout-cart';
import { draftKey, noteKey, parseDraft, clearOrderDrafts } from '@/lib/orders/draft';

const profile = { id: 'alice', full_name: 'Alice', email: 'alice@example.invalid', company: 'Firma', phone: '', address: 'Původní 1', city: 'Brno', postal_code: '60200' };
describe('Checkout review and recovery', () => {
  it('uses legacy billing fields and independent shipping fields consistently', () => {
    expect(customerFromProfile(profile)).toMatchObject({ billingAddress: 'Původní 1', shippingAddress: 'Původní 1', shippingContactName: 'Alice' });
    expect(customerFromProfile({ ...profile, billing_address: 'Nová 2', shipping_same_as_billing: false, shipping_address: 'Sklad 3' })).toMatchObject({ billingAddress: 'Nová 2', shippingAddress: 'Sklad 3' });
  });
  it('detects changed delivery/contact data but not an order note', () => {
    const original = customerFromProfile(profile);
    expect(sameCustomer(original, { ...original, note: 'Předem zavolejte' })).toBe(true);
    expect(sameCustomer(original, { ...original, shippingAddress: 'Jiná 9' })).toBe(false);
    expect(sameCustomer(original, { ...original, email: 'other@example.invalid' })).toBe(false);
  });
  it('retains uncertain attempts and receipts on reload, isolated by account', () => {
    const draft = { userId: 'alice', requestKey: '11111111-1111-4111-8111-111111111111', createdAt: Date.now(), items: [{ productId: 1, volume: '20', quantity: 2 }], totalVolume: 40, customer: { ...customerFromProfile(profile), note: 'Poznámka' }, attempted: true };
    expect(parseDraft(JSON.stringify(draft), 'alice')).toMatchObject({ attempted: true, customer: { note: 'Poznámka' } });
    expect(parseDraft(JSON.stringify({ ...draft, completedOrderId: 'order-1' }), 'alice')?.completedOrderId).toBe('order-1');
    expect(parseDraft(JSON.stringify(draft), 'bob')).toBeNull();
    expect(noteKey('alice')).not.toBe(noteKey('bob'));
    expect(noteKey('alice')).not.toBe(draftKey('alice'));
  });
  it('clears notes and drafts on sign-out without removing unrelated storage', () => {
    const data: Record<string, string> = { [draftKey('alice')]: 'draft', [noteKey('alice')]: 'note', other: 'keep' };
    const storage = Object.assign(data, { removeItem(key: string) { delete data[key]; } }) as unknown as Storage;
    clearOrderDrafts(storage);
    expect(data.other).toBe('keep');
    expect(data[noteKey('alice')]).toBeUndefined();
    expect(data[draftKey('alice')]).toBeUndefined();
  });
  it('does not delete new or changed cart contents on successful checkout', () => {
    expect(removeOrderedLines({ '1-20': 2, '2-10': 4, '3-10': 1 }, [{ productId: 1, volume: '20', quantity: 2 }, { productId: 2, volume: '10', quantity: 3 }])).toEqual({ '2-10': 4, '3-10': 1 });
  });
});
