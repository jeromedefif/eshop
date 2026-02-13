import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const LITER_CATEGORIES = ['Víno', 'Nápoje', 'Ovocné víno', 'Ovocné'];
const PACKAGE_SIZES = [3, 5, 10, 20, 30, 50];

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

const normalizeCategory = (category?: string | null) => {
  if (!category) return 'Neznámá';
  if (category === 'Ovocné') return 'Ovocné víno';
  return category;
};

const getMonthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
};

const getMonthLabel = (key: string) => {
  const [year, month] = key.split('-');
  return `${month}/${year}`;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const period = (url.searchParams.get('period') || 'all') as Period;
    const dateFilter = getDateFilter(period);

    const usersCount = await prisma.profile.count({
      where: { is_admin: false },
    });

    const ordersCount = await prisma.order.count({
      where: {
        ...(dateFilter ? { created_at: { gte: dateFilter } } : {}),
      },
    });

    const activeCustomers = await prisma.order.findMany({
      where: {
        user_id: { not: null },
        ...(dateFilter ? { created_at: { gte: dateFilter } } : {}),
      },
      distinct: ['user_id'],
      select: { user_id: true },
    });

    const profiles = await prisma.profile.findMany({
      where: { is_admin: false },
      select: {
        id: true,
        full_name: true,
        company: true,
        email: true,
      },
    });

    const profileMap = new Map(
      profiles.map((p) => [p.id, p])
    );

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

    let totalLiters = 0;
    let literOrdersCount = 0;
    let maxOrderLiters = 0;
    const productTotals: Record<string, number> = {};
    const customerTotals: Record<string, number> = {};
    const categoryTotals: Record<string, number> = {};
    const packageTotals: Record<string, number> = {};

    for (const order of orders) {
      let orderLiters = 0;

      for (const item of order.order_items) {
        const liters = parseVolume(item.volume) * item.quantity;
        if (!liters) continue;

        orderLiters += liters;
        totalLiters += liters;

        const productName = item.product?.name || `#${item.product_id}`;
        productTotals[productName] = (productTotals[productName] || 0) + liters;

        if (order.user_id) {
          customerTotals[order.user_id] = (customerTotals[order.user_id] || 0) + liters;
        }

        const category = normalizeCategory(item.product?.category);
        categoryTotals[category] = (categoryTotals[category] || 0) + liters;

        const size = parseVolume(item.volume);
        if (PACKAGE_SIZES.includes(size)) {
          const key = `${size}L`;
          packageTotals[key] = (packageTotals[key] || 0) + liters;
        }
      }

      if (orderLiters > 0) {
        literOrdersCount += 1;
        if (orderLiters > maxOrderLiters) {
          maxOrderLiters = orderLiters;
        }
      }
    }

    const averageLiters = literOrdersCount > 0
      ? Math.round((totalLiters / literOrdersCount) * 10) / 10
      : 0;

    const topProducts = Object.entries(productTotals)
      .map(([name, liters]) => ({ name, liters: Math.round(liters * 10) / 10 }))
      .sort((a, b) => b.liters - a.liters);

    const topCustomers = Object.entries(customerTotals)
      .map(([userId, liters]) => {
        const profile = profileMap.get(userId);
        return {
          user_id: userId,
          full_name: profile?.full_name || null,
          company: profile?.company || null,
          email: profile?.email || null,
          liters: Math.round(liters * 10) / 10,
        };
      })
      .sort((a, b) => b.liters - a.liters)
      .slice(0, 5);

    const categoryShares = Object.entries(categoryTotals)
      .map(([category, liters]) => ({
        category,
        liters: Math.round(liters * 10) / 10,
      }))
      .sort((a, b) => b.liters - a.liters);

    const packageShares = Object.entries(packageTotals)
      .map(([pack, liters]) => ({
        pack,
        liters: Math.round(liters * 10) / 10,
      }))
      .sort((a, b) => b.liters - a.liters);

    const totalPackageLiters = packageShares.reduce((sum, row) => sum + row.liters, 0);
    const topPackage = packageShares.length
      ? {
          pack: packageShares[0].pack,
          liters: packageShares[0].liters,
          percent: totalPackageLiters
            ? Math.round((packageShares[0].liters / totalPackageLiters) * 1000) / 10
            : 0,
        }
      : null;

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const months: string[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(startOfCurrentMonth);
      date.setMonth(date.getMonth() - i);
      months.push(getMonthKey(date));
    }

    const trendStart = new Date(startOfCurrentMonth);
    trendStart.setMonth(trendStart.getMonth() - 5);

    const trendOrders = await prisma.order.findMany({
      where: {
        user_id: { not: null },
        created_at: { gte: trendStart },
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
      orderBy: { created_at: 'asc' },
    });

    const trendTotals: Record<string, number> = {};
    for (const key of months) {
      trendTotals[key] = 0;
    }

    for (const order of trendOrders) {
      const key = getMonthKey(order.created_at);
      if (!(key in trendTotals)) continue;
      for (const item of order.order_items) {
        const liters = parseVolume(item.volume) * item.quantity;
        if (!liters) continue;
        trendTotals[key] += liters;
      }
    }

    const monthlyTrend = months.map((key, index) => {
      const liters = Math.round(trendTotals[key] * 10) / 10;
      const prevKey = index > 0 ? months[index - 1] : null;
      const prevLiters = prevKey ? Math.round(trendTotals[prevKey] * 10) / 10 : 0;
      const changePct = prevKey && prevLiters > 0
        ? Math.round(((liters - prevLiters) / prevLiters) * 1000) / 10
        : null;
      return {
        month: getMonthLabel(key),
        liters,
        change_pct: changePct,
      };
    });

    return NextResponse.json({
      users_count: usersCount,
      orders_count: ordersCount,
      total_liters: Math.round(totalLiters * 10) / 10,
      active_customers: activeCustomers.length,
      average_liters: averageLiters,
      max_order_liters: Math.round(maxOrderLiters * 10) / 10,
      top_customers: topCustomers,
      top_products: topProducts,
      category_shares: categoryShares,
      package_shares: packageShares,
      top_package: topPackage,
      monthly_trend: monthlyTrend,
    });
  } catch (error) {
    console.error('Error building summary:', error);
    return NextResponse.json(
      { error: 'Failed to build summary' },
      { status: 500 }
    );
  }
}
