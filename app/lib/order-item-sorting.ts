export const STANDARD_ORDER_CATEGORIES = ['Nápoje', 'Víno', 'Ovocné víno'] as const;
export const SPECIAL_ORDER_CATEGORIES = ['Perlivé', 'Burčák', 'Plyny', 'PET'] as const;

export type SortableOrderItem = {
  quantity?: number | null;
  volume: string | number;
  product?: {
    name?: string | null;
    category?: string | null;
  } | null;
};

export function normalizeOrderCategory(category?: string | null): string {
  if (category === 'Dusík' || category === 'Plyny') return 'Plyny';
  return category || 'Ostatní';
}

export function getOrderVolumeSortValue(volume: string | number): number {
  const normalized = String(volume ?? '').toLowerCase().trim();
  const numberMatch = normalized.match(/(\d+(?:[.,]\d+)?)/);
  if (numberMatch) return Number.parseFloat(numberMatch[1].replace(',', '.'));
  if (normalized.includes('velk')) return 2;
  if (normalized.includes('mal')) return 1;
  if (normalized.includes('balen')) return 0;
  return -1;
}

function categoryIndex(category: string, categories: readonly string[]): number {
  const index = categories.indexOf(category);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function compareOrderItems<T extends SortableOrderItem>(a: T, b: T): number {
  const categoryA = normalizeOrderCategory(a.product?.category);
  const categoryB = normalizeOrderCategory(b.product?.category);
  const standardA = STANDARD_ORDER_CATEGORIES.includes(categoryA as typeof STANDARD_ORDER_CATEGORIES[number]);
  const standardB = STANDARD_ORDER_CATEGORIES.includes(categoryB as typeof STANDARD_ORDER_CATEGORIES[number]);

  if (standardA !== standardB) return standardA ? -1 : 1;

  if (standardA && standardB) {
    const byVolume = getOrderVolumeSortValue(b.volume) - getOrderVolumeSortValue(a.volume);
    if (byVolume !== 0) return byVolume;

    const byCategory = categoryIndex(categoryA, STANDARD_ORDER_CATEGORIES)
      - categoryIndex(categoryB, STANDARD_ORDER_CATEGORIES);
    if (byCategory !== 0) return byCategory;
  } else {
    const byCategory = categoryIndex(categoryA, SPECIAL_ORDER_CATEGORIES)
      - categoryIndex(categoryB, SPECIAL_ORDER_CATEGORIES);
    if (byCategory !== 0) return byCategory;
  }

  const byQuantity = Number(b.quantity || 0) - Number(a.quantity || 0);
  if (byQuantity !== 0) return byQuantity;

  return String(a.product?.name || '').localeCompare(String(b.product?.name || ''), 'cs');
}

export function sortOrderItems<T extends SortableOrderItem>(items: readonly T[]): T[] {
  return [...items].sort(compareOrderItems);
}
