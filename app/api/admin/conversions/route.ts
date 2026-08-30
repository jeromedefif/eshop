import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import prisma from '@/lib/prisma';

type Period = '30d' | '90d' | 'year' | 'all';

const getStartDate = (period: Period) => {
  if (period === 'all') return null;
  const date = new Date();
  if (period === '30d') date.setDate(date.getDate() - 30);
  if (period === '90d') date.setDate(date.getDate() - 90);
  if (period === 'year') date.setFullYear(date.getFullYear() - 1);
  return date;
};

type FunnelRow = {
  catalog_opened: number;
  first_item_added: number;
  order_summary_opened: number;
  order_submitted: number;
  tracked_customers: number;
  average_seconds_to_order: number | null;
  template_uses: number;
  history_uses: number;
  template_orders: number;
  history_orders: number;
  recommendation_views: number;
  recommendation_adds: number;
  recommendation_orders: number;
};

type DeviceRow = { device_type: string; journeys: number; submitted: number };

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const url = new URL(request.url);
    const requestedPeriod = url.searchParams.get('period');
    const period: Period = ['30d', '90d', 'year', 'all'].includes(requestedPeriod || '')
      ? requestedPeriod as Period
      : '30d';
    const startDate = getStartDate(period);
    const whereClause = startDate
      ? Prisma.sql`where created_at >= ${startDate}`
      : Prisma.empty;

    const [funnel] = await prisma.$queryRaw<FunnelRow[]>(Prisma.sql`
      with scoped as (
        select event_name, actor_key, journey_id, created_at
        from public.analytics_events
        ${whereClause}
      ), journeys as (
        select
          journey_id,
          bool_or(event_name = 'catalog_opened') as catalog_opened,
          bool_or(event_name = 'first_item_added') as first_item_added,
          bool_or(event_name = 'order_summary_opened') as order_summary_opened,
          bool_or(event_name = 'order_submitted') as order_submitted,
          bool_or(event_name = 'template_used') as template_used,
          bool_or(event_name = 'history_order_used') as history_order_used,
          bool_or(event_name = 'recommendation_added') as recommendation_added,
          min(created_at) filter (where event_name = 'first_item_added') as first_item_at,
          min(created_at) filter (where event_name = 'order_submitted') as submitted_at
        from scoped
        group by journey_id
      )
      select
        count(*) filter (where catalog_opened)::int as catalog_opened,
        count(*) filter (where first_item_added)::int as first_item_added,
        count(*) filter (where order_summary_opened)::int as order_summary_opened,
        count(*) filter (where order_submitted)::int as order_submitted,
        (select count(distinct actor_key)::int from scoped) as tracked_customers,
        round(avg(extract(epoch from (submitted_at - first_item_at)))
          filter (where submitted_at is not null and first_item_at is not null))::int as average_seconds_to_order,
        (select count(*)::int from scoped where event_name = 'template_used') as template_uses,
        (select count(*)::int from scoped where event_name = 'history_order_used') as history_uses,
        count(*) filter (where order_submitted and template_used)::int as template_orders,
        count(*) filter (where order_submitted and history_order_used)::int as history_orders,
        (select count(*)::int from scoped where event_name = 'recommendations_shown') as recommendation_views,
        (select count(*)::int from scoped where event_name = 'recommendation_added') as recommendation_adds,
        count(*) filter (where order_submitted and recommendation_added)::int as recommendation_orders
      from journeys
    `);

    const devices = await prisma.$queryRaw<DeviceRow[]>(Prisma.sql`
      with scoped as (
        select journey_id, device_type, event_name, created_at
        from public.analytics_events
        ${whereClause}
      ), journeys as (
        select
          journey_id,
          (array_agg(device_type order by created_at asc))[1] as device_type,
          bool_or(event_name = 'order_submitted') as submitted
        from scoped
        group by journey_id
      )
      select device_type, count(*)::int as journeys,
        count(*) filter (where submitted)::int as submitted
      from journeys
      group by device_type
      order by count(*) desc
    `);

    const safeFunnel = funnel || {
      catalog_opened: 0,
      first_item_added: 0,
      order_summary_opened: 0,
      order_submitted: 0,
      tracked_customers: 0,
      average_seconds_to_order: null,
      template_uses: 0,
      history_uses: 0,
      template_orders: 0,
      history_orders: 0,
      recommendation_views: 0,
      recommendation_adds: 0,
      recommendation_orders: 0,
    };

    return NextResponse.json({ period, funnel: safeFunnel, devices }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Conversion analytics error:', error);
    return NextResponse.json({ error: 'Nepodařilo se načíst konverzní přehled.' }, { status: 500 });
  }
}
