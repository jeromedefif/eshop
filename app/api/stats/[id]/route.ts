import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const LITER_CATEGORIES = ['Víno', 'Nápoje', 'Ovocné víno', 'Ovocné'];

type Period = 'week' | 'month' | 'year' | 'all';

const getDateFilter = (period: Period) => {
  if (period === 'all') return null;

  const date = new Date();
  switch (period) {
    case 'week':
      date.setDate(date.getDate() - 7);
      break;
    case 'month':
      date.setDate(date.getDate() - 30);
      break;
    case 'year':
      date.setFullYear(date.getFullYear() - 1);
      break;
    default:
      date.setDate(date.getDate() - 30);
  }

  date.setHours(0, 0, 0, 0);
  return date;
};

const parseVolume = (volume: string) => {
  const value = parseFloat(String(volume).replace(/[^\d.-]/g, ''));
  return Number.isFinite(value) ? value : 0;
};

interface RouteParams {
  params: { id: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const userId = params.id;
    if (!userId) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    const url = new URL(request.url);
    const period = (url.searchParams.get('period') || 'all') as Period;
    const dateFilter = getDateFilter(period);

    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: {
        id: true,
        full_name: true,
        company: true,
        email: true,
        created_at: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const orders = await prisma.order.findMany({
      where: {
        user_id: userId,
        ...(dateFilter ? { created_at: { gte: dateFilter } } : {}),
      },
      include: {
        order_items: {
          include: {
            product: true,
          },
          where: {
            product: {
              category: { in: LITER_CATEGORIES },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    let totalOrders = 0;
    let totalLiters = 0;
    let lastOrderAt: string | null = null;
    const productTotals: Record<string, number> = {};

    for (const order of orders) {
      let hasLine = false;
      for (const item of order.order_items) {
        const liters = parseVolume(item.volume) * item.quantity;
        if (!liters) continue;

        hasLine = true;
        totalLiters += liters;

        const productName = item.product?.name || `#${item.product_id}`;
        productTotals[productName] = (productTotals[productName] || 0) + liters;
      }

      if (hasLine) {
        totalOrders += 1;
        if (!lastOrderAt) {
          lastOrderAt = order.created_at.toISOString();
        }
      }
    }

    const productList = Object.entries(productTotals)
      .map(([name, liters]) => ({
        name,
        liters: Math.round(liters * 10) / 10,
      }))
      .sort((a, b) => b.liters - a.liters);

    const avgLiters = totalOrders > 0
      ? Math.round((totalLiters / totalOrders) * 10) / 10
      : 0;

    return NextResponse.json({
      profile,
      stats: {
        total_orders: totalOrders,
        total_liters: Math.round(totalLiters * 10) / 10,
        average_liters: avgLiters,
        last_order_at: lastOrderAt,
      },
      products: productList,
    });
  } catch (error) {
    console.error('Error building user stats:', error);
    return NextResponse.json(
      { error: 'Failed to build user stats' },
      { status: 500 }
    );
  }
}
