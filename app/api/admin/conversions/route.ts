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
  journey_started: number;
  catalog_opened: number;
  first_item_added: number;
  cart_ready: number;
  order_summary_opened: number;
  summary_reached: number;
  order_submitted: number;
  tracked_customers: number;
  average_seconds_to_order: number | null;
  median_seconds_to_order: number | null;
  template_uses: number;
  history_uses: number;
  template_orders: number;
  history_orders: number;
  recommendation_views: number;
  recommendation_adds: number;
  recommendation_orders: number;
};

type DeviceRow = { device_type: string; journeys: number; submitted: number };

type FavoriteProductRow = {
  product_id: string;
  name: string;
  category: string;
  added_at: string;
  in_stock: boolean;
  is_archived: boolean;
};

type FavoriteCustomerRow = {
  user_id: string;
  full_name: string | null;
  company: string | null;
  email: string | null;
  favorite_count: number;
  latest_favorite_at: Date;
  products: FavoriteProductRow[];
};

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

    const funnelPromise = prisma.$queryRaw<FunnelRow[]>(Prisma.sql`
      with scoped as (
        select event_name, actor_key, journey_id, session_id, created_at
        from public.analytics_events
        ${whereClause}
      ), journeys as (
        select
          journey_id,
          bool_or(event_name in (
            'catalog_opened', 'first_item_added', 'template_used', 'history_order_used',
            'order_summary_opened', 'order_submitted'
          )) as journey_started,
          bool_or(event_name = 'catalog_opened') as catalog_opened,
          bool_or(event_name = 'first_item_added') as first_item_added,
          bool_or(event_name in (
            'first_item_added', 'template_used', 'history_order_used',
            'order_summary_opened', 'order_submitted'
          )) as cart_ready,
          bool_or(event_name = 'order_summary_opened') as order_summary_opened,
          bool_or(event_name in ('order_summary_opened', 'order_submitted')) as summary_reached,
          bool_or(event_name = 'order_submitted') as order_submitted,
          bool_or(event_name = 'template_used') as template_used,
          bool_or(event_name = 'history_order_used') as history_order_used,
          bool_or(event_name = 'recommendation_added') as recommendation_added,
          min(created_at) filter (where event_name = 'first_item_added') as first_item_at,
          min(created_at) filter (where event_name = 'order_submitted') as submitted_at
        from scoped
        group by journey_id
      ), session_steps as (
        select
          journey_id,
          session_id,
          min(created_at) filter (where event_name in (
            'first_item_added', 'template_used', 'history_order_used', 'order_summary_opened'
          )) as active_started_at,
          min(created_at) filter (where event_name = 'order_submitted') as submitted_at
        from scoped
        group by journey_id, session_id
      ), active_durations as (
        select extract(epoch from (submitted_at - active_started_at)) as seconds
        from session_steps
        where active_started_at is not null
          and submitted_at is not null
          and submitted_at >= active_started_at
          and submitted_at - active_started_at <= interval '4 hours'
      )
      select
        count(*) filter (where journey_started)::int as journey_started,
        count(*) filter (where catalog_opened)::int as catalog_opened,
        count(*) filter (where first_item_added)::int as first_item_added,
        count(*) filter (where cart_ready)::int as cart_ready,
        count(*) filter (where order_summary_opened)::int as order_summary_opened,
        count(*) filter (where summary_reached)::int as summary_reached,
        count(*) filter (where order_submitted)::int as order_submitted,
        (select count(distinct actor_key)::int from scoped) as tracked_customers,
        round(avg(extract(epoch from (submitted_at - first_item_at)))
          filter (where submitted_at is not null and first_item_at is not null))::int as average_seconds_to_order,
        (select round(percentile_cont(0.5) within group (order by seconds))::int
          from active_durations) as median_seconds_to_order,
        (select count(*)::int from scoped where event_name = 'template_used') as template_uses,
        (select count(*)::int from scoped where event_name = 'history_order_used') as history_uses,
        count(*) filter (where order_submitted and template_used)::int as template_orders,
        count(*) filter (where order_submitted and history_order_used)::int as history_orders,
        (select count(*)::int from scoped where event_name = 'recommendations_shown') as recommendation_views,
        (select count(*)::int from scoped where event_name = 'recommendation_added') as recommendation_adds,
        count(*) filter (where order_submitted and recommendation_added)::int as recommendation_orders
      from journeys
    `);

    const devicesPromise = prisma.$queryRaw<DeviceRow[]>(Prisma.sql`
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

    const favoritesPromise = prisma.$queryRaw<FavoriteCustomerRow[]>(Prisma.sql`
      select
        p.id as user_id,
        p.full_name,
        p.company,
        p.email,
        count(*)::int as favorite_count,
        max(fp.created_at) as latest_favorite_at,
        jsonb_agg(
          jsonb_build_object(
            'product_id', product.id::text,
            'name', product.name,
            'category', product.category,
            'added_at', fp.created_at,
            'in_stock', product.in_stock,
            'is_archived', product.is_archived
          )
          order by fp.created_at desc, product.name asc
        ) as products
      from public.favorite_products fp
      join public.profiles p on p.id = fp.user_id
      join public.products product on product.id = fp.product_id
      where p.is_admin = false
      group by p.id, p.full_name, p.company, p.email
      order by count(*) desc, max(fp.created_at) desc
      limit 100
    `);

    const [funnelRows, devices, favorites] = await Promise.all([
      funnelPromise,
      devicesPromise,
      favoritesPromise,
    ]);
    const [funnel] = funnelRows;

    const safeFunnel = funnel || {
      journey_started: 0,
      catalog_opened: 0,
      first_item_added: 0,
      cart_ready: 0,
      order_summary_opened: 0,
      summary_reached: 0,
      order_submitted: 0,
      tracked_customers: 0,
      average_seconds_to_order: null,
      median_seconds_to_order: null,
      template_uses: 0,
      history_uses: 0,
      template_orders: 0,
      history_orders: 0,
      recommendation_views: 0,
      recommendation_adds: 0,
      recommendation_orders: 0,
    };

    return NextResponse.json({ period, funnel: safeFunnel, devices, favorites }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Conversion analytics error:', error);
    return NextResponse.json({ error: 'Nepodařilo se načíst konverzní přehled.' }, { status: 500 });
  }
}
