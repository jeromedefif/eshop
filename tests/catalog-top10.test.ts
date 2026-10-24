import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pragueDayKey, pragueMidnight, top10Period } from '@/lib/catalog/top10-period';
const mocks = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn(), cache: new Map<string, Promise<unknown>>() }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ unstable_cache: (fn: (...args: string[]) => Promise<unknown>) => (...args: string[]) => {
  const key = JSON.stringify(args);
  if (!mocks.cache.has(key)) mocks.cache.set(key, fn(...args));
  return mocks.cache.get(key);
} }));
vi.mock('@/lib/prisma', () => ({ default: { $transaction: (fn: (tx: unknown) => unknown) => fn({ $executeRaw: mocks.execute, $queryRaw: mocks.query }) } }));
import { getDailyTop10 } from '@/lib/catalog/top10';

beforeEach(() => { mocks.cache.clear(); mocks.query.mockReset(); mocks.execute.mockReset(); mocks.query.mockResolvedValue([{ id: '116' }, { id: '164' }]); });
describe('Prague daily ranking periods', () => {
  it('changes at Czech midnight rather than UTC midnight', () => {
    expect(pragueDayKey(new Date('2026-10-24T21:59:59Z'))).toBe('2026-10-24');
    expect(pragueDayKey(new Date('2026-10-24T22:00:00Z'))).toBe('2026-10-25');
  });
  it('handles both daylight-saving transitions', () => {
    expect(pragueMidnight('2026-10-25').toISOString()).toBe('2026-10-24T22:00:00.000Z');
    expect(pragueMidnight('2026-10-26').toISOString()).toBe('2026-10-25T23:00:00.000Z');
    expect(pragueMidnight('2026-03-29').toISOString()).toBe('2026-03-28T23:00:00.000Z');
    expect(pragueMidnight('2026-03-30').toISOString()).toBe('2026-03-29T22:00:00.000Z');
  });
  it('uses a stable 90 calendar-day window ending at midnight', () => {
    const p = top10Period(new Date('2026-10-24T19:00:00Z'));
    expect(p.start.toISOString()).toBe('2026-07-25T22:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-10-23T22:00:00.000Z');
    expect(p.nextRefresh.toISOString()).toBe('2026-10-24T22:00:00.000Z');
  });
});
describe('Daily TOP 10 cache and query', () => {
  it('reuses the day key until midnight and changes it immediately afterwards', async () => {
    await getDailyTop10(new Date('2026-10-24T12:00:00Z'));
    await getDailyTop10(new Date('2026-10-24T21:59:59Z'));
    expect(mocks.query).toHaveBeenCalledTimes(1);
    await getDailyTop10(new Date('2026-10-24T22:00:00Z'));
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });
  it('exposes only ranked IDs and dates, with a read-only bounded aggregate query', async () => {
    expect(await getDailyTop10(new Date('2026-10-24T12:00:00Z'))).toEqual({ productIds: ['116', '164'], day: '2026-10-24', periodStart: '2026-07-25T22:00:00.000Z', periodEnd: '2026-10-23T22:00:00.000Z', nextRefreshAt: '2026-10-24T22:00:00.000Z' });
    const sql = mocks.query.mock.calls[0][0].join('');
    expect(sql).toContain('count(DISTINCT o.id)');
    expect(sql).toContain("o.status <> 'cancelled'");
    expect(sql).toContain("p.category IN ('Víno', 'Nápoje', 'Perlivé', 'Ovocné víno')");
    expect(sql).toContain('LIMIT 10');
    expect(mocks.execute.mock.calls[0][0].join('')).toContain('READ ONLY');
  });
});
