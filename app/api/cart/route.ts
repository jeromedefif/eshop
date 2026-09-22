import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/auth/require-user';
import { saveCart, validCart } from '@/lib/orders/cart';
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const cart = await prisma.customerCart.findUnique({ where: { user_id: user.id } });
  return NextResponse.json({ exists: !!cart, items: cart?.items || {}, revision: cart?.revision || 0 }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function PUT(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    if (body.userId !== user.id) return NextResponse.json({ error: 'Účet se změnil. Obnovte stránku.' }, { status: 409 });
    if (!Number.isSafeInteger(body.revision) || body.revision < 0 || !validCart(body.items)) return NextResponse.json({ error: 'Neplatný košík.' }, { status: 400 });
    const cart = await saveCart(prisma, user.id, body.revision, body.items);
    if (!cart) return NextResponse.json({ error: 'Košík byl změněn na jiném zařízení. Načtěte společný košík.' }, { status: 409 });
    return NextResponse.json({ revision: cart.revision });
  } catch { return NextResponse.json({ error: 'Košík se nepodařilo synchronizovat.' }, { status: 503 }); }
}
