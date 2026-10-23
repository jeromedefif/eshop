import { describe, it, expect } from 'vitest';
import { activeHeaderNotices, DEFAULT_HEADER_NOTICES, parseHeaderNotices } from '@/lib/header-notices';
const notice = { ...DEFAULT_HEADER_NOTICES[0] };
describe('Header notice settings', () => {
  it('distinguishes an intentional empty/disabled configuration from the fallback', () => {
    expect(parseHeaderNotices([])).toEqual([]);
    expect(activeHeaderNotices([{ ...notice, enabled: false }])).toEqual([]);
    expect(activeHeaderNotices(DEFAULT_HEADER_NOTICES)).toHaveLength(1);
  });
  it('rejects oversized, empty, malformed and invalid-date messages', () => {
    for (const value of [null, Array(4).fill(notice), [{ ...notice, text: ' ' }], [{ ...notice, text: 'x'.repeat(181) }], [{ ...notice, enabled: 'true' }], [{ ...notice, startsAt: 'tomorrow' }], [{ ...notice, startsAt: '2026-10-23T12:00' }], [{ ...notice, startsAt: '2026-10-23T12:00:00Z', endsAt: '2026-10-23T11:00:00Z' }]]) {
      expect(() => parseHeaderNotices(value)).toThrow();
    }
  });
  it('preserves order and observes inclusive start and exclusive end in absolute time', () => {
    const messages = parseHeaderNotices([
      { ...notice, text: 'První', startsAt: '2026-10-23T14:00:00+02:00', endsAt: '2026-10-23T13:00:00Z' },
      { ...notice, text: 'Druhá' },
    ]);
    expect(activeHeaderNotices(messages, Date.parse('2026-10-23T12:00:00Z')).map(m => m.text)).toEqual(['První', 'Druhá']);
    expect(activeHeaderNotices(messages, Date.parse('2026-10-23T13:00:00Z')).map(m => m.text)).toEqual(['Druhá']);
  });
});
