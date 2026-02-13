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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const period = (url.searchParams.get('period') || 'all') as Period;
    const dateFilter = getDateFilter(period);

    const profiles = await prisma.profile.findMany({
      where: { is_admin: false },
      select: {
        id: true,
        full_name: true,
        company: true,
        email: true,
      },
    });

    const orders = await prisma.order.findMany({
      where: {
        user_id: { not: null },
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

    const statsByUser: Record<string, {
      totalOrders: number;
      totalLiters: number;
      productTotals: Record<string, number>;
    }> = {};

    for (const order of orders) {
      if (!order.user_id) continue;
      if (!statsByUser[order.user_id]) {
        statsByUser[order.user_id] = {
          totalOrders: 0,
          totalLiters: 0,
          productTotals: {},
        };
      }

      const userStats = statsByUser[order.user_id];
      let hasLine = false;

      for (const item of order.order_items) {
        const liters = parseVolume(item.volume) * item.quantity;
        if (!liters) continue;

        hasLine = true;
        userStats.totalLiters += liters;

        const productName = item.product?.name || `#${item.product_id}`;
        userStats.productTotals[productName] =
          (userStats.productTotals[productName] || 0) + liters;
      }

      if (hasLine) {
        userStats.totalOrders += 1;
      }
    }

    const response = profiles
      .map((profile) => {
        const stats = statsByUser[profile.id] || {
          totalOrders: 0,
          totalLiters: 0,
          productTotals: {},
        };

        const topEntry = Object.entries(stats.productTotals)
          .sort((a, b) => b[1] - a[1])[0];

        return {
          user_id: profile.id,
          full_name: profile.full_name,
          company: profile.company,
          email: profile.email,
          total_orders: stats.totalOrders,
          total_liters: Math.round(stats.totalLiters * 10) / 10,
          top_product: topEntry
            ? { name: topEntry[0], liters: Math.round(topEntry[1] * 10) / 10 }
            : null,
        };
      })
      .sort((a, b) => b.total_liters - a.total_liters);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error building stats:', error);
    return NextResponse.json(
      { error: 'Failed to build stats' },
      { status: 500 }
    );
  }
}
