import { requireAdmin } from '@/lib/auth/require-admin';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { withOrderSnapshots } from '@/lib/orders/snapshots';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'month';
    const search = (url.searchParams.get('search') || '').trim().slice(0, 200);
    const userId = url.searchParams.get('userId');
    const paginated = url.searchParams.has('page');
    const page = Math.max(1, Math.min(100000, Number(url.searchParams.get('page')) || 1));
    if (!Number.isInteger(page)) return NextResponse.json({ error: 'Neplatná stránka.' }, { status: 400 });
    const pageSize = 50;
    const where: Prisma.OrderWhereInput = userId ? { user_id: userId } : {};
    if (period !== 'all') {
      const from = new Date();
      if (period === 'year') from.setFullYear(from.getFullYear() - 1);
      else from.setDate(from.getDate() - (period === 'week' ? 7 : 30));
      from.setHours(0, 0, 0, 0); where.created_at = { gte: from };
    }
    if (search) {
      const matchingIds = await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM public.orders WHERE strpos(lower(id::text), lower(${search})) > 0`;
      where.OR = [
        { customer_name: { contains: search, mode: 'insensitive' } },
        { customer_email: { contains: search, mode: 'insensitive' } },
        { customer_company: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
        { internal_note: { is: { note: { contains: search, mode: 'insensitive' } } } },
        { id: { in: matchingIds.map(o => o.id) } },
      ];
    }
    const [rows, total] = await prisma.$transaction([
      prisma.order.findMany({ where, include: { order_items: { include: { product: true } }, internal_note: { select: { note: true, updated_at: true } } },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }], ...(paginated ? { skip: (page - 1) * pageSize, take: pageSize } : {}) }),
      prisma.order.count({ where }),
    ]);
    const orders = rows.map(withOrderSnapshots);
    const payload = paginated ? { orders, pagination: { page, pageSize, totalOrders: total, hasMore: page * pageSize < total } } : orders;
    return new NextResponse(JSON.stringify(payload, (_key, value) => typeof value === 'bigint' ? String(value) : value), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Orders query failed', error);
    return NextResponse.json({ error: 'Objednávky se nepodařilo načíst.' }, { status: 500 });
  }
}
