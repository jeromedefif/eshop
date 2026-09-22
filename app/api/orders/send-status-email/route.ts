import { after, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import prisma from '@/lib/prisma';
import { UUID } from '@/lib/orders/validation';
import { statusMessage } from '@/lib/email/templates';
import { deliverPendingEmails } from '@/lib/email/delivery';

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { orderId, status } = await request.json();
    if (typeof orderId !== 'string' || !UUID.test(orderId) || !['confirmed', 'cancelled'].includes(status)) return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 });
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { order_items: { include: { product: true } } } });
    if (!order) return NextResponse.json({ error: 'Objednávka nenalezena.' }, { status: 404 });
    if (order.status !== status) return NextResponse.json({ error: 'Stav objednávky se mezitím změnil. Obnovte stránku.' }, { status: 409 });
    await prisma.emailDelivery.createMany({ data: [{ ...statusMessage(order), order_id: order.id }], skipDuplicates: true });
    after(async () => { await deliverPendingEmails(order.id); });
    return NextResponse.json({ success: true, queued: true }, { status: 202 });
  } catch {
    return NextResponse.json({ error: 'Oznámení se nepodařilo zařadit.' }, { status: 503 });
  }
}
