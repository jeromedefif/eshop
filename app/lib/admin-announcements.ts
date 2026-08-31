import 'server-only';

import type { Announcement, Product } from '@prisma/client';
import prisma from '@/lib/prisma';
import { PRODUCT_CATEGORIES } from '@/lib/product-config';

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
  let targetProductId: bigint | null = null;

  if (targetType === 'category') {
    const category = typeof payload.targetValue === 'string' ? payload.targetValue : '';
    if (!PRODUCT_CATEGORIES.includes(category as typeof PRODUCT_CATEGORIES[number])) {
      throw new Error('Neplatná cílová kategorie.');
    }
    targetCategory = category;
  } else if (targetType === 'product') {
    const value = typeof payload.targetValue === 'string' ? payload.targetValue : '';
    try {
      targetProductId = BigInt(value);
    } catch {
      throw new Error('Neplatný cílový produkt.');
    }
    const product = await prisma.product.findFirst({
      where: { id: targetProductId, is_archived: false },
      select: { id: true },
    });
    if (!product) throw new Error('Cílový produkt nebyl nalezen.');
  } else if (targetType !== null && targetType !== '' && targetType !== undefined) {
    throw new Error('Neplatný typ odkazu.');
  }

  return {
    title,
    body,
    variant,
    starts_at: startsAt,
    ends_at: endsAt,
    target_category: targetCategory,
    target_product_id: targetProductId,
    dismissible: payload.dismissible !== false,
    is_active: payload.isActive !== false,
  };
}

type AnnouncementWithProduct = Announcement & {
  target_product?: Pick<Product, 'name'> | null;
};

export function serializeAnnouncement(announcement: AnnouncementWithProduct) {
  return {
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    variant: announcement.variant,
    startsAt: announcement.starts_at.toISOString(),
    endsAt: announcement.ends_at?.toISOString() ?? null,
    targetType: announcement.target_product_id ? 'product' : announcement.target_category ? 'category' : null,
    targetValue: announcement.target_product_id ? String(announcement.target_product_id) : announcement.target_category,
    targetLabel: announcement.target_product?.name ?? announcement.target_category,
    dismissible: announcement.dismissible,
    isActive: announcement.is_active,
    createdAt: announcement.created_at.toISOString(),
    updatedAt: announcement.updated_at.toISOString(),
  };
}
