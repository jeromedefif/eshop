import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { HeaderNoticeConflict, readHeaderNoticeSettings, saveHeaderNoticeSettings } from '@/lib/header-notice-store';
import { parseHeaderNotices } from '@/lib/header-notices';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Nemáte oprávnění.' }, { status: 401, headers });
  try {
    return NextResponse.json({ ...await readHeaderNoticeSettings(), localOnly: process.env.NODE_ENV === 'development' }, { headers });
  } catch {
    return NextResponse.json({ error: 'Nastavení proužku není dostupné. Ověřte databázovou migraci.' }, { status: 503, headers });
  }
}
export async function PUT(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Nemáte oprávnění.' }, { status: 401, headers });
  let messages;
  let revision;
  try {
    const payload = await request.json();
    messages = parseHeaderNotices(payload.messages);
    revision = payload.revision;
    if (typeof revision !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(revision)) throw new Error('Neplatná verze nastavení. Načtěte nastavení znovu.');
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Neplatné nastavení.' }, { status: 400, headers });
  }
  try {
    return NextResponse.json(await saveHeaderNoticeSettings(messages, revision), { headers });
  } catch (error) {
    if (error instanceof HeaderNoticeConflict) return NextResponse.json({ error: 'Nastavení mezitím změnil jiný správce. Před další úpravou jej znovu načtěte.' }, { status: 409, headers });
    return NextResponse.json({ error: 'Nastavení se nepodařilo uložit. Zkuste to znovu.' }, { status: 503, headers });
  }
}
