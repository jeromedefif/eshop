import { NextResponse } from 'next/server';
import { readHeaderNoticeSettings } from '@/lib/header-notice-store';
import { activeHeaderNotices, DEFAULT_HEADER_NOTICES } from '@/lib/header-notices';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const { messages } = await readHeaderNoticeSettings();
    return NextResponse.json({ messages: activeHeaderNotices(messages) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Header notices unavailable:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ messages: DEFAULT_HEADER_NOTICES }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
