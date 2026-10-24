import { describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('@/lib/catalog/top10', () => ({ getDailyTop10: mocks.read }));
import { GET } from '@/api/catalog/top10/route';
describe('Public daily ranking endpoint', () => {
  it('returns the cached public ranking without serving a stale HTTP response', async () => {
    const data = { productIds: ['116'], day: '2026-10-24', nextRefreshAt: '2026-10-24T22:00:00.000Z' };
    mocks.read.mockResolvedValue(data);
    const response = await GET();
    expect(await response.json()).toEqual(data);
    expect(response.headers.get('Cache-Control')).toContain('must-revalidate');
  });
  it('isolates database failures and never exposes internal diagnostics', async () => {
    mocks.read.mockRejectedValue(new Error('private connection details'));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('private');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
