import { requireAdmin } from '@/lib/auth/require-admin';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { customerStats, periodStart } from '@/lib/stats/queries';
export async function GET(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const [profiles, stats] = await Promise.all([
      prisma.profile.findMany({ where: { is_admin: false }, select: { id: true, full_name: true, company: true, email: true } }),
      customerStats(prisma, periodStart(new URL(request.url).searchParams.get('period') || 'all')),
    ]);
    const byUser = new Map(stats.map(s => [s.user_id,s]));
    return NextResponse.json(profiles.map(profile => {
      const stat = byUser.get(profile.id); const top = stat?.products[0];
      return { user_id: profile.id, full_name: profile.full_name, company: profile.company, email: profile.email,
        total_orders: stat?.total_orders || 0, total_liters: Math.round((stat?.total_liters || 0)*10)/10,
        top_product: top ? { name: top.name, liters: Math.round(top.liters*10)/10 } : null };
    }).sort((a,b) => b.total_liters-a.total_liters));
  } catch { return NextResponse.json({ error: 'Statistiky se nepodařilo načíst.' }, { status: 500 }); }
}
