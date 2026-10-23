import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ files: new Map<string, string>(), query: vi.fn(), execute: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/prisma', () => ({ default: { $queryRaw: state.query, $executeRaw: state.execute } }));
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(async (file: string) => { if (!state.files.has(file)) throw Object.assign(new Error(), { code: 'ENOENT' }); return state.files.get(file); }),
  mkdir: vi.fn(async () => {}),
  writeFile: vi.fn(async (file: string, data: string) => { state.files.set(file, data); }),
  rename: vi.fn(async (from: string, to: string) => { state.files.set(to, state.files.get(from)!); state.files.delete(from); }),
}));
import { HeaderNoticeConflict, readHeaderNoticeSettings, saveHeaderNoticeSettings } from '@/lib/header-notice-store';
import { DEFAULT_HEADER_NOTICES } from '@/lib/header-notices';
beforeEach(() => { vi.stubEnv('NODE_ENV', 'development'); state.files.clear(); vi.clearAllMocks(); });
describe('Isolated header notice persistence', () => {
  it('never queries or updates production in local development', async () => {
    const initial = await readHeaderNoticeSettings();
    await saveHeaderNoticeSettings([], initial.revision);
    expect((await readHeaderNoticeSettings()).messages).toEqual([]);
    expect(state.query).not.toHaveBeenCalled(); expect(state.execute).not.toHaveBeenCalled();
  });
  it('rejects concurrent stale edits instead of overwriting another administrator', async () => {
    const initial = await readHeaderNoticeSettings();
    const results = await Promise.allSettled([saveHeaderNoticeSettings([], initial.revision), saveHeaderNoticeSettings(DEFAULT_HEADER_NOTICES, initial.revision)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const failure = results.find(r => r.status === 'rejected');
    expect(failure?.status === 'rejected' && failure.reason).toBeInstanceOf(HeaderNoticeConflict);
  });
  it('enforces the revision check in the production update', async () => {
    vi.stubEnv('NODE_ENV', 'production'); state.execute.mockResolvedValue(0);
    await expect(saveHeaderNoticeSettings([], '00000000-0000-4000-8000-000000000000')).rejects.toBeInstanceOf(HeaderNoticeConflict);
    expect(state.execute).toHaveBeenCalledTimes(1);
  });
});
