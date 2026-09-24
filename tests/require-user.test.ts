import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), cookies: vi.fn(), client: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.client }));
vi.mock('next/headers', () => ({ cookies: mocks.cookies }));
import { requireUser } from '@/lib/auth/require-user';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.client.mockReturnValue({ auth: { getUser: mocks.getUser } });
});
it('validates bearer tokens with Auth instead of trusting token claims', async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'alice' } }, error: null });
  expect(await requireUser(new Request('https://example.test', { headers: { authorization: 'Bearer access-token' } }))).toEqual({ id: 'alice' });
  expect(mocks.getUser).toHaveBeenCalledWith('access-token');
  expect(mocks.cookies).not.toHaveBeenCalled();
});
it('rejects invalid tokens without falling back to a cookie identity', async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Invalid JWT') });
  expect(await requireUser(new Request('https://example.test', { headers: { authorization: 'Bearer invalid' } }))).toBeNull();
  expect(mocks.cookies).not.toHaveBeenCalled();
});
it('rejects malformed authorization without querying Auth', async () => {
  expect(await requireUser(new Request('https://example.test', { headers: { authorization: 'Basic invalid' } }))).toBeNull();
  expect(mocks.getUser).not.toHaveBeenCalled();
});
