import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import prisma from '@/lib/prisma';
import { deliverPendingEmails } from '@/lib/email/delivery';

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const deliveries = await prisma.emailDelivery.findMany({ where: { status: { not: 'sent' } }, orderBy: { created_at: 'asc' }, take: 100,
    select: { id: true, order_id: true, status: true, attempts: true, last_error: true, created_at: true, next_attempt_at: true } });
  return NextResponse.json(deliveries, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await deliverPendingEmails());
}
