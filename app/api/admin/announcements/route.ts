import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import { normalizeProductCategory, PRODUCT_CATEGORIES } from '@/lib/product-config';
import { parseAnnouncementPayload, serializeAnnouncement } from '@/lib/admin-announcements';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [announcements, products] = await Promise.all([
      prisma.announcement.findMany({
        include: { target_product: { select: { name: true } } },
        orderBy: [{ is_active: 'desc' }, { starts_at: 'desc' }],
      }),
      prisma.product.findMany({
        where: { is_archived: false },
        select: { id: true, name: true, category: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({
      announcements: announcements.map(serializeAnnouncement),
      products: products.map((product) => ({
        ...product,
        id: String(product.id),
        category: normalizeProductCategory(product.category),
      })),
      categories: [...PRODUCT_CATEGORIES],
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Admin announcements GET error:', error);
    return NextResponse.json({ error: 'Oznámení se nepodařilo načíst.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const payload = await request.json() as Record<string, unknown>;
    const data = await parseAnnouncementPayload(payload);
    const announcement = await prisma.announcement.create({
      data,
      include: { target_product: { select: { name: true } } },
    });
    return NextResponse.json({ announcement: serializeAnnouncement(announcement) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Oznámení se nepodařilo uložit.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
