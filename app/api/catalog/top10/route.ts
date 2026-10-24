import { NextResponse } from 'next/server';
import { getDailyTop10 } from '@/lib/catalog/top10';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const result = await getDailyTop10();
    return NextResponse.json(result, { headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' } });
  } catch {
    // Ranking availability must never affect catalog browsing or checkout.
    return NextResponse.json({ error: 'Žebříček se nyní nepodařilo načíst. Katalog můžete používat dál.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
