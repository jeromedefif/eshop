import type { Product } from '@/types/database';
import type { CartItems, OrderConfirmationData, OrderCustomer } from '@/types/orders';
import { sortOrderItems } from '@/lib/order-item-sorting';
import { normalizeProductCategory } from '@/lib/product-config';
import { draftKey, parseDraft, sameDraftContents, type OrderDraft } from './draft';

export function orderDataFromCart(cart: CartItems, products: Product[], customer: OrderCustomer): OrderConfirmationData {
  const lines = Object.entries(cart).filter(([, quantity]) => quantity > 0).map(([key, quantity]) => {
    const [id, volume] = key.split('-');
    const product = products.find(p => String(p.id) === id);
    if (!product) throw new Error('Některá položka již není v katalogu. Obnovte katalog a upravte košík.');
    return { product, volume, quantity };
  });
  if (!lines.length) throw new Error('Nejdříve přidejte položky do košíku.');
  const items = sortOrderItems(lines).map(({ product, volume, quantity }) => {
    const category = normalizeProductCategory(product.category);
    return {
      productId: Number(product.id), productName: product.name, productCategory: category, volume, quantity,
      display: category === 'PET' ? `${quantity}× balení` : category === 'Plyny' ? `${quantity}× ${volume === 'maly' ? 'malý' : 'velký'}` : `${volume}L × ${quantity}`,
    };
  });
  const totalVolume = items.reduce((sum, item) => sum + (['PET', 'Plyny'].includes(item.productCategory) ? 0 : (Number(item.volume) || 0) * item.quantity), 0);
  return { items, totalVolume, customer };
}

export function prepareOrderDraft(storage: Storage, userId: string, data: OrderConfirmationData): OrderDraft {
  const prior = parseDraft(storage.getItem(draftKey(userId)), userId);
  // An uncertain submission must be resolved before another request key is created.
  if (prior?.attempted && !prior.completedOrderId) return prior;
  const draft: OrderDraft = { ...data, userId, requestKey: prior && !prior.completedOrderId && sameDraftContents(prior, data) ? prior.requestKey : crypto.randomUUID(), createdAt: Date.now() };
  storage.setItem(draftKey(userId), JSON.stringify(draft));
  return draft;
}
