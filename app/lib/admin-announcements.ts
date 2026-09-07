import 'server-only';

import type { Announcement, Product } from '@prisma/client';
import prisma from '@/lib/prisma';
import { PRODUCT_CATEGORIES } from '@/lib/product-config';
import { MAX_LINKED_PRODUCTS, normalizeCatalogProductIds } from '@/lib/catalog-product-links';

const VARIANTS = ['info', 'warning', 'important'] as const;

function parseDate(value: unknown, required: boolean) {
  if ((value === null || value === '') && !required) return null;
  if (typeof value !== 'string') throw new Error('Neplatné datum.');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Neplatné datum.');
  return date;
}

export async function parseAnnouncementPayload(payload: Record<string, unknown>) {
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  const variant = typeof payload.variant === 'string' ? payload.variant : 'info';
  const startsAt = parseDate(payload.startsAt, true) as Date;
  const endsAt = parseDate(payload.endsAt, false);
  const targetType = payload.targetType;

  if (!title || title.length > 160) throw new Error('Nadpis musí mít 1 až 160 znaků.');
  if (!body || body.length > 3000) throw new Error('Text musí mít 1 až 3000 znaků.');
  if (!VARIANTS.includes(variant as typeof VARIANTS[number])) throw new Error('Neplatný typ oznámení.');
  if (endsAt && endsAt <= startsAt) throw new Error('Konec zobrazení musí být později než začátek.');

  let targetCategory: string | null = null;
  let targetProductIds: bigint[] = [];

  if (targetType === 'category') {
    const category = typeof payload.targetValue === 'string' ? payload.targetValue : '';
    if (!PRODUCT_CATEGORIES.includes(category as typeof PRODUCT_CATEGORIES[number])) {
      throw new Error('Neplatná cílová kategorie.');
    }
    targetCategory = category;
  } else if (targetType === 'product') {
    const rawValues = Array.isArray(payload.targetValues)
      ? payload.targetValues
      : typeof payload.targetValue === 'string'
        ? [payload.targetValue]
        : [];
    const values = normalizeCatalogProductIds(rawValues.map((value) => typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint' ? value : null));

    if (values.length === 0) throw new Error('Vyberte alespoň jeden cílový produkt.');
    if (rawValues.length > MAX_LINKED_PRODUCTS) throw new Error(`Lze vybrat nejvýše ${MAX_LINKED_PRODUCTS} produktů.`);

    targetProductIds = values.map((value) => BigInt(value));
    const products = await prisma.product.findMany({
      where: { id: { in: targetProductIds }, is_archived: false },
      select: { id: true },
    });
    if (products.length !== targetProductIds.length) throw new Error('Některý z cílových produktů nebyl nalezen.');
  } else if (targetType !== null && targetType !== '' && targetType !== undefined) {
    throw new Error('Neplatný typ odkazu.');
  }

  return {
    data: {
      title,
      body,
      variant,
      starts_at: startsAt,
      ends_at: endsAt,
      target_category: targetCategory,
      // První produkt zůstává i v původním poli pro bezpečný rollback aplikace.
      target_product_id: targetProductIds[0] ?? null,
      dismissible: payload.dismissible !== false,
      is_active: payload.isActive !== false,
    },
    targetProductIds,
  };
}

type AnnouncementWithProducts = Announcement & {
  target_product?: Pick<Product, 'id' | 'name' | 'is_archived'> | null;
  target_products?: Array<{
    product: Pick<Product, 'id' | 'name' | 'is_archived'>;
  }>;
};

export function serializeAnnouncement(announcement: AnnouncementWithProducts) {
  const relationProducts = (announcement.target_products || [])
    .map((target) => target.product)
    .filter((product) => !product.is_archived);
  const fallbackProduct = announcement.target_product && !announcement.target_product.is_archived
    ? [announcement.target_product]
    : [];
  const targetProducts = relationProducts.length > 0 ? relationProducts : fallbackProduct;
  const targetValues = targetProducts.map((product) => String(product.id));
  const targetLabels = targetProducts.map((product) => product.name);
  const targetType = targetValues.length > 0 ? 'product' : announcement.target_category ? 'category' : null;

  return {
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    variant: announcement.variant,
    startsAt: announcement.starts_at.toISOString(),
    endsAt: announcement.ends_at?.toISOString() ?? null,
    targetType,
    targetValue: targetType === 'product' ? targetValues[0] ?? null : announcement.target_category,
    targetValues: targetType === 'product' ? targetValues : [],
    targetLabel: targetType === 'product' ? targetLabels.join(', ') || null : announcement.target_category,
    targetLabels: targetType === 'product' ? targetLabels : [],
    dismissible: announcement.dismissible,
    isActive: announcement.is_active,
    createdAt: announcement.created_at.toISOString(),
    updatedAt: announcement.updated_at.toISOString(),
  };
}
