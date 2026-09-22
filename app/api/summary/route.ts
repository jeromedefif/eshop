import { requireAdmin } from '@/lib/auth/require-admin';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { periodStart, summaryStats, monthlyStats } from '@/lib/stats/queries';
export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const since = periodStart(new URL(request.url).searchParams.get('period') || 'all');
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    });
    const [usersCount, counts, aggregate, trend] = await Promise.all([
      prisma.profile.count({ where: { is_admin: false } }),
      prisma.$queryRaw<Array<{ orders: number; customers: number }>>`SELECT count(*)::int AS orders, count(DISTINCT user_id)::int AS customers FROM public.orders ${since ? Prisma.sql`WHERE created_at >= ${since}` : Prisma.empty}`,
      summaryStats(prisma, since), monthlyStats(prisma, new Date(now.getFullYear(), now.getMonth()-5,1)),
    ]);
    const round = (n: number) => Math.round(n*10)/10;
    const roundRows = <T extends { liters: number }>(rows: T[]) => rows.map(row => ({ ...row, liters: round(row.liters) }));
    const packages = roundRows(aggregate.package_shares);
    const packageTotal = packages.reduce((sum,row) => sum+row.liters,0);
    const byMonth = new Map(trend.map(row => [row.month,round(row.liters)]));
    return NextResponse.json({
      users_count: usersCount, orders_count: counts[0].orders, active_customers: counts[0].customers,
      total_liters: round(aggregate.total_liters), average_liters: round(aggregate.average_liters), max_order_liters: round(aggregate.max_order_liters),
      top_products: roundRows(aggregate.top_products), top_customers: roundRows(aggregate.top_customers),
      category_shares: roundRows(aggregate.category_shares), package_shares: packages,
      top_package: packages[0] ? { ...packages[0], percent: packageTotal ? round(packages[0].liters/packageTotal*100) : 0 } : null,
      monthly_trend: months.map((key,index) => {
        const liters = byMonth.get(key) || 0; const previous = index ? byMonth.get(months[index-1]) || 0 : 0;
        return { month: `${key.slice(5)}/${key.slice(0,4)}`, liters, change_pct: previous > 0 ? round((liters-previous)/previous*100) : null };
      }),
    });
  } catch (error) {
    console.error('Summary aggregation failed', error);
    return NextResponse.json({ error: 'Souhrn se nepodařilo načíst.' }, { status: 500 });
  }
}
