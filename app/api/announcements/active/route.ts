import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { serializeAnnouncement } from '@/lib/admin-announcements';

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
        target_products: { include: { product: { select: { id: true, name: true, is_archived: true } } } },
      },
      orderBy: [{ starts_at: 'desc' }, { created_at: 'desc' }],
      take: 5,
    });

    return NextResponse.json({
      announcements: announcements.map(serializeAnnouncement),
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
