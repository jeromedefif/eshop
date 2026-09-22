import { after, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/auth/require-user';
import { createOrder } from '@/lib/orders/create';
import { OrderInputError, parseOrderRequest } from '@/lib/orders/validation';
import { deliverPendingEmails } from '@/lib/email/delivery';

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Přihlaste se prosím.' }, { status: 401 });
  try {
    const text = await request.text();
    if (text.length > 50000) return NextResponse.json({ error: 'Objednávka je příliš velká.' }, { status: 413 });
    const body = JSON.parse(text);
    if (body.userId !== user.id) return NextResponse.json({ error: 'Účet se změnil. Otevřete nový souhrn objednávky.' }, { status: 409 });
    const input = parseOrderRequest(body);
    const order = await createOrder(prisma, user.id, input);
    after(async () => { await deliverPendingEmails(order.id); });
    return NextResponse.json({ orderId: order.id, notificationStatus: 'queued' }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderInputError || error instanceof SyntaxError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Checkout failed', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ error: 'Objednávku se nepodařilo potvrdit. Opakujte stejný pokus; nevznikne duplicita.' }, { status: 503 });
  }
}
