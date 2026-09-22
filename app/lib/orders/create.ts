import { Prisma, type PrismaClient } from '@prisma/client';
import { receiptMessages } from '@/lib/email/templates';
import { OrderInputError, orderFingerprint, validateOrderItems, type OrderRequest } from './validation';

export async function createOrder(db: PrismaClient, userId: string, input: OrderRequest) {
  const fingerprint = orderFingerprint(input);
  const findExisting = () => db.order.findUnique({ where: { user_id_request_key: { user_id: userId, request_key: input.requestKey } } });
  const checkExisting = (order: NonNullable<Awaited<ReturnType<typeof findExisting>>>) => {
    if (order.request_hash !== fingerprint) throw new OrderInputError('Tento pokus již byl uložen s jiným obsahem. Otevřete historii objednávek.');
    return order;
  };
  const existing = await findExisting();
  if (existing) return checkExisting(existing);
  try {
    return await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))::text`;
      const prior = await tx.order.findUnique({ where: { user_id_request_key: { user_id: userId, request_key: input.requestKey } } });
      if (prior) return checkExisting(prior);
      const recent = await tx.order.count({ where: { user_id: userId, created_at: { gte: new Date(Date.now() - 3600000) } } });
      if (recent >= 30) throw new OrderInputError('Bylo dosaženo limitu objednávek za hodinu. Zkuste to později nebo nás kontaktujte.');
      // Lock products so concurrent stock/archive changes cannot split validation and insert.
      const ids = input.items.map((item) => BigInt(item.productId));
      await tx.$queryRaw`SELECT id FROM public.products WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR SHARE`;
      const products = await tx.product.findMany({ where: { id: { in: ids } } });
      const { records, totalVolume } = validateOrderItems(input.items, products);
      const profile = await tx.profile.findUnique({ where: { id: userId } });
      if (!profile?.email || !profile.full_name) throw new OrderInputError('Před objednáním doplňte jméno a e-mail v profilu.');
      const shipping = profile.shipping_same_as_billing;
      const billingAddress = profile.billing_address || profile.address;
      const billingCity = profile.billing_city || profile.city;
      const billingPostal = profile.billing_postal_code || profile.postal_code;
      const order = await tx.order.create({
        data: {
          user_id: userId, request_key: input.requestKey, request_hash: fingerprint,
          customer_name: profile.full_name, customer_email: profile.email,
          customer_phone: profile.phone, customer_company: profile.company,
          customer_company_id: profile.company_id, customer_vat_id: profile.vat_id,
          billing_address: billingAddress, billing_city: billingCity,
          billing_postal_code: billingPostal, billing_country: profile.billing_country,
          shipping_company: shipping ? profile.company : profile.shipping_company,
          shipping_contact_name: shipping ? profile.full_name : profile.shipping_contact_name,
          shipping_address: shipping ? billingAddress : profile.shipping_address,
          shipping_city: shipping ? billingCity : profile.shipping_city,
          shipping_postal_code: shipping ? billingPostal : profile.shipping_postal_code,
          shipping_country: shipping ? profile.billing_country : profile.shipping_country,
          delivery_instructions: profile.delivery_instructions, note: input.note,
          total_volume: totalVolume, status: 'pending', order_items: { create: records },
        },
        include: { order_items: { include: { product: true } } },
      });
      await tx.emailDelivery.createMany({ data: receiptMessages(order).map((message) => ({ ...message, order_id: order.id })) });
      return order;
    });
  } catch (error) {
    // The unique constraint arbitrates two concurrent requests using the same key.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const order = await findExisting();
      if (order) return checkExisting(order);
    }
    throw error;
  }
}
