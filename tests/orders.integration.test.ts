import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { saveCart } from '@/lib/orders/cart';
import { customerStats, summaryStats } from '@/lib/stats/queries';
import { createOrder } from '@/lib/orders/create';
import { parseOrderRequest } from '@/lib/orders/validation';
import { deliverPendingEmails } from '@/lib/email/delivery';
const url = process.env.TEST_DATABASE_URL;
if (url && (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname) || !new URL(url).pathname.endsWith('_test'))) throw new Error('Integration tests require an isolated local _test database.');
const db = url ? new PrismaClient({ datasourceUrl: url }) : null;
const suite = url ? describe : describe.skip;
suite('Atomic checkout and durable delivery (real PostgreSQL)', () => {
  const alice = randomUUID(); const bob = randomUUID(); const admin = randomUUID();
  let productId: bigint;
  const input = () => parseOrderRequest({ requestKey: randomUUID(), items: [{ productId: String(productId), quantity: 2, volume: '10' }], totalVolume: 99999 });
  beforeAll(async () => {
    await db!.user.createMany({ data: [{ id: alice }, { id: bob }, { id: admin }] });
    await db!.profile.createMany({ data: [{ id: alice, full_name: 'Alice', email: 'alice@example.invalid' }, { id: bob, full_name: 'Bob', email: 'bob@example.invalid' }, { id: admin, is_admin: true }] });
    productId = (await db!.product.create({ data: { name: 'Test wine', category: 'Víno' } })).id;
  });
  afterAll(async () => {
    const orders = await db!.order.findMany({ where: { user_id: { in: [alice, bob] } }, select: { id: true } });
    await db!.orderItem.deleteMany({ where: { order_id: { in: orders.map(o => o.id) } } });
    await db!.order.deleteMany({ where: { user_id: { in: [alice, bob] } } });
    await db!.product.delete({ where: { id: productId } });
    await db!.profile.deleteMany({ where: { id: { in: [alice, bob, admin] } } });
    await db!.user.deleteMany({ where: { id: { in: [alice, bob, admin] } } });
    await db!.$disconnect();
  });
  it('concurrent retry produces exactly one order, all lines and two notifications', async () => {
    const request = input();
    const [a, b] = await Promise.all([createOrder(db!, alice, request), createOrder(db!, alice, request)]);
    expect(a.id).toBe(b.id); expect(Number(a.total_volume)).toBe(20);
    expect(await db!.orderItem.count({ where: { order_id: a.id } })).toBe(1);
    expect(await db!.emailDelivery.count({ where: { order_id: a.id } })).toBe(2);
    await expect(createOrder(db!, alice, { ...request, note: 'changed' })).rejects.toThrow('jiným obsahem');
  });
  it('rolls back the order and items if queuing the notification fails', async () => {
    await db!.$executeRawUnsafe(`CREATE FUNCTION public.test_delivery_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected queue failure'; END $$`);
    await db!.$executeRawUnsafe('CREATE TRIGGER test_delivery_failure BEFORE INSERT ON public.email_deliveries FOR EACH ROW EXECUTE FUNCTION public.test_delivery_failure()');
    const request = input();
    try {
      await expect(createOrder(db!, alice, request)).rejects.toThrow("injected queue failure");
      expect(await db!.order.count({ where: { request_key: request.requestKey } })).toBe(0);
    } finally {
      await db!.$executeRawUnsafe('DROP TRIGGER test_delivery_failure ON public.email_deliveries');
      await db!.$executeRawUnsafe('DROP FUNCTION public.test_delivery_failure()');
    }
  });
  it('rejects invalid order without creating any header', async () => {
    const request = input(); request.items[0].volume = '999';
    await expect(createOrder(db!, alice, request)).rejects.toThrow();
    expect(await db!.order.count({ where: { request_key: request.requestKey } })).toBe(0);
  });
  it('records provider errors, retries only failed delivery and does not duplicate sent messages', async () => {
    const order = await createOrder(db!, alice, input());
    let calls = 0;
    await deliverPendingEmails(order.id, db!, async () => { calls++; return calls === 1 ? { data: null, error: { message: 'provider unavailable' } } : { data: { id: 'sent-1' }, error: null }; });
    expect(await db!.emailDelivery.count({ where: { order_id: order.id, status: 'failed' } })).toBe(1);
    await db!.emailDelivery.updateMany({ where: { order_id: order.id, status: 'failed' }, data: { next_attempt_at: new Date(0) } });
    await Promise.all([deliverPendingEmails(order.id, db!, async () => { calls++; return { data: { id: 'sent-2' }, error: null }; }), deliverPendingEmails(order.id, db!, async () => { calls++; return { data: { id: 'unexpected' }, error: null }; })]);
    expect(calls).toBe(3);
    expect(await db!.emailDelivery.count({ where: { order_id: order.id, status: 'sent' } })).toBe(2);
  });
  it('does not resend an ambiguous delivery outside provider deduplication window', async () => {
    const order = await createOrder(db!, alice, input());
    await db!.emailDelivery.updateMany({ where: { order_id: order.id }, data: { status: 'sending', claimed_at: new Date(0), first_attempt_at: new Date(0) } });
    await deliverPendingEmails(order.id, db!, async () => { throw new Error('must not send'); });
    expect(await db!.emailDelivery.count({ where: { order_id: order.id, status: 'review' } })).toBe(2);
  });
  it('enforces own-profile visibility and denies role escalation and direct order inserts', async () => {
    await db!.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET LOCAL ROLE authenticated');
      await tx.$queryRaw`SELECT set_config('request.jwt.claim.sub', ${alice}, true)`;
      expect((await tx.profile.findMany()).map(p => p.id)).toEqual([alice]);
      expect(await tx.product.updateMany({ where: { id: productId }, data: { name: 'hacked' } })).toMatchObject({ count: 0 });
    });
    for (const query of [
      `UPDATE public.profiles SET is_admin=true WHERE id='${alice}'`,
      `INSERT INTO public.orders (id,user_id,customer_name,customer_email,total_volume) VALUES (gen_random_uuid(),'${alice}','a','a',0)`,
      'TRUNCATE public.products',
    ]) await expect(db!.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET LOCAL ROLE authenticated');
      await tx.$queryRaw`SELECT set_config('request.jwt.claim.sub', ${alice}, true)`;
      await tx.$executeRawUnsafe(query);
    })).rejects.toThrow();
  });
  it('does not overwrite a cart saved concurrently on another device', async () => {
    const first = await saveCart(db!, alice, 0, { [`${productId}-10`]: 2 });
    expect(first?.revision).toBe(1);
    const [a,b] = await Promise.all([saveCart(db!, alice, 1, { [`${productId}-10`]: 3 }), saveCart(db!, alice, 1, { [`${productId}-10`]: 4 })]);
    expect([a,b].filter(Boolean)).toHaveLength(1);
    expect((await db!.customerCart.findUnique({ where: { user_id: alice } }))?.revision).toBe(2);
  });
  it('aggregates in SQL and preserves a product snapshot after renaming', async () => {
    const order = await createOrder(db!, bob, input());
    await db!.product.update({ where: { id: productId }, data: { name: 'Renamed product' } });
    const [stat] = await customerStats(db!, null, bob);
    expect(stat.total_orders).toBe(1);
    expect(stat.total_liters).toBe(20);
    expect(stat.products).toEqual([{ name: 'Test wine', liters: 20 }]);
    const summary = await summaryStats(db!, null);
    expect(summary.total_liters).toBeGreaterThanOrEqual(20);
    expect(summary.package_shares).toContainEqual({ pack: '10L', liters: summary.total_liters });
    expect(await db!.orderItem.findFirst({ where: { order_id: order.id } })).toMatchObject({ product_name: 'Test wine' });
  });
  it('still lets an administrator edit products and a customer edit their own name', async () => {
    await db!.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET LOCAL ROLE authenticated');
      await tx.$queryRaw`SELECT set_config('request.jwt.claim.sub', ${admin}, true)`;
      expect(await tx.product.updateMany({ where: { id: productId }, data: { name: 'Admin update' } })).toMatchObject({ count: 1 });
    });
    await db!.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET LOCAL ROLE authenticated');
      await tx.$queryRaw`SELECT set_config('request.jwt.claim.sub', ${alice}, true)`;
      expect(await tx.profile.updateMany({ where: { id: alice }, data: { full_name: 'Own update' } })).toMatchObject({ count: 1 });
    });
  });
});
