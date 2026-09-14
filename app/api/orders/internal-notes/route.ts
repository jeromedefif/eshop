import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: 'Nemáte oprávnění zobrazit interní poznámky.' },
      { status: 403 }
    );
  }

  try {
    const payload = await request.json();
    if (!Array.isArray(payload.orderIds)) {
      return NextResponse.json({ error: 'Chybí seznam objednávek.' }, { status: 400 });
    }

    const orderIds = Array.from(new Set<string>(
      payload.orderIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    )).slice(0, 1000);

    if (orderIds.length === 0) {
      return NextResponse.json({ notes: [] });
    }

    const notes = await prisma.orderInternalNote.findMany({
      where: { order_id: { in: orderIds } },
      select: { order_id: true, note: true, updated_at: true },
    });

    return NextResponse.json({ notes }, {
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    });
  } catch (error) {
    console.error('Error fetching internal order notes:', error);
    return NextResponse.json({ error: 'Nepodařilo se načíst interní poznámky.' }, { status: 500 });
  }
}
