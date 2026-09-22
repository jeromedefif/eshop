import { Prisma, type PrismaClient } from '@prisma/client';
export function periodStart(period: string): Date | null {
  if (period === 'all') return null;
  const date = new Date();
  if (period === 'year') date.setFullYear(date.getFullYear() - 1);
  else date.setDate(date.getDate() - (period === 'week' ? 7 : 30));
  date.setHours(0, 0, 0, 0); return date;
}
// Only the aggregate crosses the DB boundary; current product metadata is a
// fallback for historical lines which predate immutable snapshots.
export function lineQuery(since: Date | null, userId?: string) {
  return Prisma.sql`
    SELECT o.id AS order_id, o.user_id, o.created_at,
      coalesce(i.product_name,p.name) AS name,
      CASE WHEN coalesce(i.product_category,p.category)='Ovocné' THEN 'Ovocné víno' ELSE coalesce(i.product_category,p.category) END AS category,
      CASE WHEN regexp_replace(i.volume,'[^0-9.-]','','g') ~ '^[0-9]+([.][0-9]+)?$'
        THEN regexp_replace(i.volume,'[^0-9.-]','','g')::double precision ELSE 0 END AS volume,
      i.quantity
    FROM public.orders o JOIN public.order_items i ON i.order_id=o.id JOIN public.products p ON p.id=i.product_id
    WHERE o.user_id IS NOT NULL
      AND coalesce(i.product_category,p.category) IN ('Víno','Perlivé','Nápoje','Ovocné víno','Burčák','Ovocné')
      ${since ? Prisma.sql`AND o.created_at >= ${since}` : Prisma.empty}
      ${userId ? Prisma.sql`AND o.user_id = ${userId}::uuid` : Prisma.empty}
  `;
}
export type CustomerStats = { user_id: string; total_orders: number; total_liters: number; last_order_at: Date; products: Array<{ name: string; liters: number }> };
export async function customerStats(db: PrismaClient, since: Date | null, userId?: string) {
  return db.$queryRaw<CustomerStats[]>`
    WITH lines AS (${lineQuery(since, userId)}),
    totals AS (SELECT user_id, count(DISTINCT order_id)::int AS total_orders, sum(volume*quantity)::double precision AS total_liters,
      max(created_at) AS last_order_at FROM lines WHERE volume*quantity <> 0 GROUP BY user_id),
    products AS (SELECT user_id,name,sum(volume*quantity)::double precision AS liters FROM lines WHERE volume*quantity <> 0 GROUP BY user_id,name)
    SELECT t.*, coalesce((SELECT jsonb_agg(jsonb_build_object('name',p.name,'liters',p.liters) ORDER BY p.liters DESC,p.name)
      FROM products p WHERE p.user_id=t.user_id),'[]'::jsonb) AS products FROM totals t
  `;
}
export type SummaryAggregate = {
  total_liters: number; average_liters: number; max_order_liters: number;
  top_products: Array<{ name: string; liters: number }>;
  top_customers: Array<{ user_id: string; full_name: string | null; company: string | null; email: string | null; liters: number }>;
  category_shares: Array<{ category: string; liters: number }>;
  package_shares: Array<{ pack: string; liters: number }>;
};
export async function summaryStats(db: PrismaClient, since: Date | null) {
  const [result] = await db.$queryRaw<SummaryAggregate[]>`
    WITH lines AS (${lineQuery(since)}),
    by_order AS (SELECT order_id, sum(volume*quantity) AS liters FROM lines GROUP BY order_id HAVING sum(volume*quantity)>0),
    by_product AS (SELECT name, sum(volume*quantity) AS liters FROM lines WHERE volume*quantity <> 0 GROUP BY name),
    by_customer AS (SELECT user_id, sum(volume*quantity) AS liters FROM lines WHERE volume*quantity <> 0 GROUP BY user_id),
    by_category AS (SELECT category, sum(volume*quantity) AS liters FROM lines WHERE volume*quantity <> 0 GROUP BY category),
    by_package AS (SELECT volume::text || 'L' AS pack, sum(volume*quantity) AS liters FROM lines WHERE volume IN (3,5,10,20,25,30,50) GROUP BY volume),
    top_customers AS (SELECT c.user_id, p.full_name, p.company, p.email, c.liters FROM by_customer c
      LEFT JOIN public.profiles p ON p.id=c.user_id AND NOT p.is_admin ORDER BY c.liters DESC LIMIT 5)
    SELECT coalesce(sum(liters),0)::double precision AS total_liters,
      coalesce(avg(liters),0)::double precision AS average_liters, coalesce(max(liters),0)::double precision AS max_order_liters,
      coalesce((SELECT jsonb_agg(p ORDER BY p.liters DESC,p.name) FROM by_product p),'[]'::jsonb) AS top_products,
      coalesce((SELECT jsonb_agg(c ORDER BY c.liters DESC) FROM top_customers c),'[]'::jsonb) AS top_customers,
      coalesce((SELECT jsonb_agg(c ORDER BY c.liters DESC) FROM by_category c),'[]'::jsonb) AS category_shares,
      coalesce((SELECT jsonb_agg(p ORDER BY p.liters DESC) FROM by_package p),'[]'::jsonb) AS package_shares
    FROM by_order
  `;
  return result;
}
export async function monthlyStats(db: PrismaClient, since: Date) {
  return db.$queryRaw<Array<{ month: string; liters: number }>>`
    WITH lines AS (${lineQuery(since)}) SELECT to_char(created_at AT TIME ZONE 'Europe/Prague','YYYY-MM') AS month,
      sum(volume*quantity)::double precision AS liters FROM lines GROUP BY month ORDER BY month
  `;
}
