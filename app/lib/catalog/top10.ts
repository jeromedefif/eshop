import 'server-only';
import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';
import { top10Period } from './top10-period';

// The Prague calendar day is part of the persistent Data Cache key. No rolling
// 24-hour TTL or stale-while-revalidate can retain yesterday's ranking at midnight.
const dailyRanking = unstable_cache(async (day: string) => {
  const { start, end } = top10Period(new Date(`${day}T12:00:00Z`));
  const rows = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    await tx.$executeRaw`SET LOCAL statement_timeout = '5000ms'`;
    return tx.$queryRaw<Array<{ id: string }>>`
      SELECT p.id::text AS id
      FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      JOIN public.products p ON p.id = oi.product_id
      WHERE o.created_at >= ${start} AND o.created_at < ${end}
        AND o.status <> 'cancelled' AND p.is_archived = false AND p.in_stock = true
        AND p.category IN ('Víno', 'Nápoje', 'Perlivé', 'Ovocné víno')
      GROUP BY p.id, p.name
      ORDER BY count(DISTINCT o.id) DESC,
        sum(CASE WHEN oi.volume ~ '^[0-9]+([.][0-9]+)?$' THEN oi.volume::numeric * oi.quantity ELSE 0 END) DESC,
        p.name ASC, p.id ASC
      LIMIT 10
    `;
  }, { timeout: 7000, maxWait: 3000 });
  return rows.map(row => row.id);
}, ['catalog-top10-prague-v1'], { revalidate: false });

export async function getDailyTop10(now = new Date()) {
  const period = top10Period(now);
  return { productIds: await dailyRanking(period.day), day: period.day, periodStart: period.start.toISOString(), periodEnd: period.end.toISOString(), nextRefreshAt: period.nextRefresh.toISOString() };
}
