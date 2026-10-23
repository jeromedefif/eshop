import 'server-only';
import { readFile, mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import prisma from '@/lib/prisma';
import { DEFAULT_HEADER_NOTICES, parseHeaderNotices, type HeaderNotice, type HeaderNoticeSettings } from '@/lib/header-notices';

// Development always uses a separate local file, even when DATABASE_URL points at production.
const localFile = path.join(process.cwd(), '.cache', 'header-notices.json');
const localRevision = '00000000-0000-4000-8000-000000000000';
let localWriteQueue: Promise<unknown> = Promise.resolve();
export class HeaderNoticeConflict extends Error {}

export async function readHeaderNoticeSettings(): Promise<HeaderNoticeSettings> {
  if (process.env.NODE_ENV === 'development') {
    try {
      const settings = JSON.parse(await readFile(localFile, 'utf8')) as HeaderNoticeSettings;
      return { messages: parseHeaderNotices(settings.messages), revision: settings.revision };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      return { messages: DEFAULT_HEADER_NOTICES, revision: localRevision };
    }
  }
  const [row] = await prisma.$queryRaw<HeaderNoticeSettings[]>`
    SELECT messages, revision::text FROM public.header_notice_settings WHERE id = true
  `;
  if (!row) throw new Error('Header notice settings not initialized');
  return { messages: parseHeaderNotices(row.messages), revision: row.revision };
}

export async function saveHeaderNoticeSettings(messages: HeaderNotice[], revision: string): Promise<HeaderNoticeSettings> {
  const next = { messages, revision: randomUUID() };
  if (process.env.NODE_ENV === 'development') {
    const write = localWriteQueue.then(async () => {
      const current = await readHeaderNoticeSettings();
      if (current.revision !== revision) throw new HeaderNoticeConflict();
      await mkdir(path.dirname(localFile), { recursive: true });
      const temporaryFile = `${localFile}.${next.revision}.tmp`;
      await writeFile(temporaryFile, JSON.stringify(next), { mode: 0o600 });
      await rename(temporaryFile, localFile);
      return next;
    });
    localWriteQueue = write.catch(() => {});
    return write;
  }
  const count = await prisma.$executeRaw`
    UPDATE public.header_notice_settings
    SET messages = ${JSON.stringify(messages)}::jsonb, revision = ${next.revision}::uuid, updated_at = now()
    WHERE id = true AND revision = ${revision}::uuid
  `;
  if (count !== 1) throw new HeaderNoticeConflict();
  return next;
}
