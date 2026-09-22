import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), admin: vi.fn(), findOrder: vi.fn(), findProfile: vi.fn(), queue: vi.fn(), createOrder: vi.fn() }));
vi.mock('@/lib/auth/require-user', () => ({ requireUser: mocks.user }));
vi.mock('@/lib/auth/require-admin', () => ({ requireAdmin: mocks.admin }));
vi.mock('@/lib/prisma', () => ({ default: { order: { findFirst: mocks.findOrder }, profile: { findUnique: mocks.findProfile }, emailDelivery: { createMany: mocks.queue } } }));
vi.mock('@/lib/orders/create', () => ({ createOrder: mocks.createOrder }));
vi.mock('@/lib/email/delivery', () => ({ deliverPendingEmails: vi.fn() }));
vi.mock('next/server', async (original) => ({ ...await original<typeof import('next/server')>(), after: vi.fn() }));
import { POST as sendEmail } from '@/api/send-email/route';
import { POST as checkout } from '@/api/checkout/route';
import { GET as cron } from '@/api/cron/email-deliveries/route';
const request = (body: unknown) => new Request('http://localhost/api/test', { method: 'POST', body: JSON.stringify(body) });
describe('HTTP authentication boundaries', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue(null); });
  it('does not even query an order or enqueue an email for anonymous requests', async () => {
    expect((await sendEmail(request({ orderId: '11111111-1111-4111-8111-111111111111' }))).status).toBe(401);
    expect(mocks.findOrder).not.toHaveBeenCalled(); expect(mocks.queue).not.toHaveBeenCalled();
  });
  it('constrains email lookup to the authenticated owner', async () => {
    mocks.user.mockResolvedValue({ id: 'alice' }); mocks.findProfile.mockResolvedValue({ is_admin: false }); mocks.findOrder.mockResolvedValue(null);
    expect((await sendEmail(request({ orderId: '11111111-1111-4111-8111-111111111111' }))).status).toBe(404);
    expect(mocks.findOrder).toHaveBeenCalledWith(expect.objectContaining({ where: { id: '11111111-1111-4111-8111-111111111111', user_id: 'alice' } }));
    expect(mocks.queue).not.toHaveBeenCalled();
  });
  it('rejects checkout if cookies switched to another account after the draft was made', async () => {
    mocks.user.mockResolvedValue({ id: 'bob' });
    expect((await checkout(request({ userId: 'alice' }))).status).toBe(409);
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });
  it('fails closed when cron secret is missing or incorrect', async () => {
    vi.stubEnv('CRON_SECRET', '');
    expect((await cron(new Request('http://localhost/api/cron/email-deliveries'))).status).toBe(401);
    vi.stubEnv('CRON_SECRET', 'private-secret');
    expect((await cron(new Request('http://localhost/api/cron/email-deliveries', { headers: { authorization: 'Bearer wrong' } }))).status).toBe(401);
    vi.unstubAllEnvs();
  });
});
