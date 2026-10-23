import { draftKey, type OrderDraft } from './draft';
import type { OrderCustomer } from '@/types/orders';

export class CheckoutSubmissionError extends Error {
  constructor(message: string, public draft: OrderDraft) { super(message); }
}

/** Shared transport for regular and quick checkout. Persist the key before any POST. */
export async function submitCheckoutDraft(draft: OrderDraft, storage: Storage, isCurrent = () => true, send: typeof fetch = fetch): Promise<OrderDraft> {
  let attempted = { ...draft, attempted: true };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    if (!isCurrent()) throw new Error('Účet se změnil. Přihlaste se znovu.');
    storage.setItem(draftKey(draft.userId), JSON.stringify(attempted));
    const response = await send('/api/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ userId: draft.userId, requestKey: draft.requestKey, items: draft.items, note: draft.customer.note || '', expectedCustomer: draft.customer }),
    });
    const result = await response.json();
    if (!isCurrent()) throw new Error('Účet se změnil. Ověřte objednávku po opětovném přihlášení.');
    if (!response.ok) {
      if (result.code === 'CUSTOMER_CHANGED') attempted = { ...attempted, attempted: false, customer: { ...result.customer, note: attempted.customer.note } };
      else if (response.status === 400) attempted = { ...attempted, attempted: false };
      storage.setItem(draftKey(draft.userId), JSON.stringify(attempted));
      throw new Error(result.error || 'Odeslání se nepodařilo ověřit. Opakujte stejný pokus nebo zkontrolujte historii objednávek.');
    }
    if (typeof result.orderId !== 'string' || !result.orderId) throw new Error('Server nevrátil číslo objednávky. Opakujte stejný pokus pro ověření výsledku.');
    const completed = { ...attempted, customer: (result.customer as OrderCustomer | undefined) || attempted.customer, completedOrderId: result.orderId };
    // Receipt persistence failure must never turn an accepted order into a failed one.
    try { storage.setItem(draftKey(draft.userId), JSON.stringify(completed)); } catch { /* The persisted request key protects retries. */ }
    return completed;
  } catch (e) {
    throw new CheckoutSubmissionError(e instanceof Error && e.name !== 'AbortError' && !(e instanceof TypeError) ? e.message : 'Odpověď serveru nepřišla včas. Objednávka již mohla být přijata. Opakujte stejný pokus pro ověření; nevznikne druhá objednávka.', attempted);
  } finally { clearTimeout(timer); }
}
