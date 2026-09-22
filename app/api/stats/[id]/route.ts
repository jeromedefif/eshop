import { requireAdmin } from '@/lib/auth/require-admin';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { customerStats, periodStart } from '@/lib/stats/queries';
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await props.params;
  try {
    const profile = await prisma.profile.findUnique({ where: { id }, select: { id: true, full_name: true, company: true, email: true, created_at: true } });
    if (!profile) return NextResponse.json({ error: 'Uživatel nenalezen.' }, { status: 404 });
    const [stats] = await customerStats(prisma, periodStart(new URL(request.url).searchParams.get('period') || 'all'), id);
    return NextResponse.json({ profile, stats: { total_orders: stats?.total_orders || 0, total_liters: Math.round((stats?.total_liters || 0)*10)/10,
      average_liters: stats?.total_orders ? Math.round(stats.total_liters/stats.total_orders*10)/10 : 0,
      last_order_at: stats?.last_order_at || null }, products: (stats?.products || []).map(p => ({ ...p, liters: Math.round(p.liters*10)/10 })) });
  } catch { return NextResponse.json({ error: 'Statistiky se nepodařilo načíst.' }, { status: 500 }); }
}
