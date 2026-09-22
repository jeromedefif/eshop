import { after, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/auth/require-user';
import { UUID } from '@/lib/orders/validation';
import { receiptMessages } from '@/lib/email/templates';
import { deliverPendingEmails } from '@/lib/email/delivery';

// Compatibility endpoint for clients opened before the checkout upgrade.
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Přihlaste se prosím.' }, { status: 401 });
  try {
    const { orderId } = await request.json();
    if (typeof orderId !== 'string' || !UUID.test(orderId)) return NextResponse.json({ error: 'Neplatná objednávka.' }, { status: 400 });
    const admin = await prisma.profile.findUnique({ where: { id: user.id }, select: { is_admin: true } });
    const order = await prisma.order.findFirst({ where: { id: orderId, ...(admin?.is_admin ? {} : { user_id: user.id }) }, include: { order_items: { include: { product: true } } } });
    if (!order) return NextResponse.json({ error: 'Objednávka nenalezena.' }, { status: 404 });
    if (!order.order_items.length) return NextResponse.json({ error: 'Objednávka nemá položky.' }, { status: 409 });
    await prisma.emailDelivery.createMany({ data: receiptMessages(order).map((message) => ({ ...message, order_id: order.id })), skipDuplicates: true });
    after(async () => { await deliverPendingEmails(order.id); });
    return NextResponse.json({ success: true, queued: true }, { status: 202 });
  } catch {
    return NextResponse.json({ error: 'Oznámení se nepodařilo zařadit.' }, { status: 503 });
  }
}
