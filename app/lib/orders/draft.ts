import type { OrderConfirmationData } from '@/types/orders';
export type OrderDraft = OrderConfirmationData & { userId: string; requestKey: string; createdAt: number };
const PREFIX = 'beginy:order-draft:';
export const draftKey = (userId: string) => `${PREFIX}${userId}`;
export function sameDraftContents(a: OrderConfirmationData, b: OrderConfirmationData) {
  const contents = (order: OrderConfirmationData) => JSON.stringify({
    items: order.items.map(item => [String(item.productId), String(item.volume), item.quantity])
      .sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y))),
    note: (order.customer.note || '').trim(),
  });
  return contents(a) === contents(b);
}
export function parseDraft(raw: string | null, userId: string, now = Date.now()): OrderDraft | null {
  try {
    if (!raw) return null;
    const draft = JSON.parse(raw) as OrderDraft;
    if (draft.userId !== userId || typeof draft.requestKey !== 'string' || !Array.isArray(draft.items) || !draft.items.length || !Number.isFinite(draft.createdAt) || now - draft.createdAt > 86400000 || draft.createdAt > now) return null;
    if (!draft.customer || typeof draft.customer !== 'object' || !Number.isFinite(draft.totalVolume)) return null;
    if (draft.customer.note !== undefined && typeof draft.customer.note !== 'string') return null;
    if (!draft.items.every(item => item && typeof item === 'object' && Number.isSafeInteger(item.quantity) && item.quantity > 0)) return null;
    return draft;
  } catch { return null; }
}
export function clearOrderDrafts(storage: Storage) {
  for (const key of Object.keys(storage)) if (key.startsWith(PREFIX) || key === 'pendingOrderData') storage.removeItem(key);
}
