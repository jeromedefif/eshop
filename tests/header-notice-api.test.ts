import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ admin: vi.fn(), read: vi.fn(), save: vi.fn() }));
vi.mock('@/lib/auth/require-admin', () => ({ requireAdmin: mocks.admin }));
vi.mock('@/lib/header-notice-store', () => ({ readHeaderNoticeSettings: mocks.read, saveHeaderNoticeSettings: mocks.save, HeaderNoticeConflict: class extends Error {} }));
import { GET, PUT } from '@/api/admin/header-notices/route';
describe('Header notice admin authorization', () => {
  it('rejects unauthenticated and non-admin calls before accessing the settings', async () => {
    mocks.admin.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await PUT(new Request('https://example.invalid', { method: 'PUT', body: '{}' }))).status).toBe(401);
    expect(mocks.read).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it('rejects invalid settings even for administrators', async () => {
    mocks.admin.mockResolvedValue({ id: 'admin' });
    expect((await PUT(new Request('https://example.invalid', { method: 'PUT', body: JSON.stringify({ messages: [], revision: 'bad' }) }))).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
});

import { GET as publicGET } from '@/api/header-notices/route';
import { DEFAULT_HEADER_NOTICES } from '@/lib/header-notices';
describe('Public header notice data', () => {
  it('returns no drafts, disabled messages or administrator revision', async () => {
    mocks.read.mockResolvedValue({ revision: 'private-revision', messages: [
      ...DEFAULT_HEADER_NOTICES,
      { ...DEFAULT_HEADER_NOTICES[0], text: 'Disabled', enabled: false },
      { ...DEFAULT_HEADER_NOTICES[0], text: 'Future', startsAt: '2099-01-01T00:00:00Z' },
    ] });
    const response = await publicGET();
    expect(await response.json()).toEqual({ messages: DEFAULT_HEADER_NOTICES });
  });
  it('keeps an intentionally empty configuration empty', async () => {
    mocks.read.mockResolvedValue({ messages: [], revision: 'private' });
    expect(await (await publicGET()).json()).toEqual({ messages: [] });
  });
});
