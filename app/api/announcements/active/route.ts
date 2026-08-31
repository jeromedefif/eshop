import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();
    const announcements = await prisma.announcement.findMany({
      where: {
        is_active: true,
        starts_at: { lte: now },
        OR: [{ ends_at: null }, { ends_at: { gt: now } }],
      },
      include: {
        target_product: { select: { id: true, name: true, is_archived: true } },
      },
      orderBy: [{ starts_at: 'desc' }, { created_at: 'desc' }],
      take: 5,
    });

    return NextResponse.json({
      announcements: announcements.map((announcement) => ({
        id: announcement.id,
        title: announcement.title,
        body: announcement.body,
        variant: announcement.variant,
        startsAt: announcement.starts_at.toISOString(),
        endsAt: announcement.ends_at?.toISOString() ?? null,
        dismissible: announcement.dismissible,
        updatedAt: announcement.updated_at.toISOString(),
        targetType: announcement.target_product_id
          ? 'product'
          : announcement.target_category
            ? 'category'
            : null,
        targetValue: announcement.target_product_id
          ? String(announcement.target_product_id)
          : announcement.target_category,
        targetLabel: announcement.target_product_id
          ? announcement.target_product && !announcement.target_product.is_archived
            ? announcement.target_product.name
            : null
          : announcement.target_category,
      })),
    }, {
      // Časové okno a změny provedené administrátorem se musí projevit ihned.
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    // Aditivní nasazení zůstává bezpečné i v krátkém okně před aplikací migrace.
    console.error('Active announcements error:', error);
    return NextResponse.json({ announcements: [] }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
