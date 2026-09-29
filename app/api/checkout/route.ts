import { after, NextResponse } from 'next/server';
import { CustomerChangedError, customerFromProfile } from '@/lib/orders/customer';
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
    if (body.expectedCustomer !== undefined && (!body.expectedCustomer || typeof body.expectedCustomer !== 'object' || Array.isArray(body.expectedCustomer) || Object.values(body.expectedCustomer).some(value => typeof value !== 'string'))) {
      throw new OrderInputError('Neplatné kontaktní údaje. Otevřete znovu kontrolu objednávky.');
    }
    const input = parseOrderRequest(body);
    const order = await createOrder(prisma, user.id, input, body.expectedCustomer);
    after(async () => { await deliverPendingEmails(order.id); });
    return NextResponse.json({ orderId: order.id, notificationStatus: 'queued', customer: {
      name: order.customer_name || '', email: order.customer_email || '', phone: order.customer_phone || '',
      company: order.customer_company || '', companyId: order.customer_company_id || '', vatId: order.customer_vat_id || '',
      billingAddress: order.billing_address || '', billingCity: order.billing_city || '', billingPostalCode: order.billing_postal_code || '', billingCountry: order.billing_country || '',
      shippingCompany: order.shipping_company || '', shippingContactName: order.shipping_contact_name || '',
      shippingAddress: order.shipping_address || '', shippingCity: order.shipping_city || '', shippingPostalCode: order.shipping_postal_code || '', shippingCountry: order.shipping_country || '',
      deliveryInstructions: order.delivery_instructions || '', note: order.note || '',
    } }, { status: 201 });
  } catch (error) {
    if (error instanceof CustomerChangedError) return NextResponse.json({ error: error.message, code: 'CUSTOMER_CHANGED', customer: error.customer }, { status: 409 });
    if (error instanceof OrderInputError || error instanceof SyntaxError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Checkout failed', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ error: 'Objednávku se nepodařilo potvrdit. Opakujte stejný pokus; nevznikne duplicita.' }, { status: 503 });
  }
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Přihlaste se prosím.' }, { status: 401 });
  try {
    const profile = await prisma.profile.findUnique({ where: { id: user.id } });
    if (!profile) return NextResponse.json({ error: 'Doplňte prosím svůj profil.' }, { status: 404 });
    return NextResponse.json({ userId: user.id, customer: customerFromProfile({ ...profile, email: profile.email || '' }) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Kontaktní údaje se nepodařilo načíst. Zkuste to znovu.' }, { status: 503 });
  }
}
