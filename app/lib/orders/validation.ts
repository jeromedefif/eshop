import { createHash } from 'crypto';
import { isVolumeAllowed, normalizeProductCategory } from '@/lib/product-config';

export class OrderInputError extends Error {}
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type SubmittedItem = { productId: string; quantity: number; volume: string };
export type OrderRequest = { requestKey: string; note: string; items: SubmittedItem[] };

export function parseOrderRequest(value: unknown): OrderRequest {
  if (!value || typeof value !== 'object') throw new OrderInputError('Neplatná objednávka.');
  const input = value as Record<string, unknown>;
  if (typeof input.requestKey !== 'string' || !UUID.test(input.requestKey)) throw new OrderInputError('Chybí identifikátor objednávky.');
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 200) throw new OrderInputError('Objednávka musí obsahovat 1 až 200 položek.');
  if (input.note !== undefined && (typeof input.note !== 'string' || input.note.length > 5000)) throw new OrderInputError('Poznámka může mít nejvýše 5000 znaků.');
  const keys = new Set<string>();
  const items = input.items.map((raw): SubmittedItem => {
    if (!raw || typeof raw !== 'object') throw new OrderInputError('Neplatná položka.');
    const id = String(raw.productId);
    const volume = String(raw.volume);
    if (!/^[1-9]\d{0,17}$/.test(id) || !Number.isSafeInteger(raw.quantity) || raw.quantity < 1 || raw.quantity > 10000 || volume.length > 30) throw new OrderInputError('Neplatné množství nebo produkt.');
    const key = `${id}:${volume}`;
    if (keys.has(key)) throw new OrderInputError('Duplicitní položka objednávky.');
    keys.add(key);
    return { productId: id, volume, quantity: raw.quantity };
  }).sort((a, b) => `${a.productId}:${a.volume}`.localeCompare(`${b.productId}:${b.volume}`));
  return { requestKey: input.requestKey, note: String(input.note ?? '').trim(), items };
}

export function orderFingerprint(input: OrderRequest) {
  return createHash('sha256').update(JSON.stringify({ items: input.items, note: input.note })).digest('hex');
}

type Product = { id: bigint; name: string; category: string; in_stock: boolean; is_archived: boolean; min_order_qty: number; allowed_volumes: string[] };
export function validateOrderItems(items: SubmittedItem[], products: Product[]) {
  let totalVolume = 0;
  const records = items.map((item) => {
    const product = products.find((p) => String(p.id) === item.productId);
    if (!product || product.is_archived || !product.in_stock) throw new OrderInputError('Některý produkt již není dostupný. Upravte košík.');
    if (!isVolumeAllowed(product, item.volume) || item.quantity < product.min_order_qty) throw new OrderInputError(`Zkontrolujte objem a minimální odběr produktu „${product.name}“.`);
    if (!['PET', 'Plyny'].includes(normalizeProductCategory(product.category))) {
      const liters = Number(item.volume);
      if (!Number.isFinite(liters) || liters <= 0) throw new OrderInputError('Neplatný objem produktu.');
      totalVolume += liters * item.quantity;
    }
    return { product_id: product.id, quantity: item.quantity, volume: item.volume, product_name: product.name, product_category: product.category };
  });
  return { totalVolume, records };
}
