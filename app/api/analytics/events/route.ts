import { createHmac } from 'crypto';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const EVENT_NAMES = new Set([
  'catalog_opened',
  'first_item_added',
  'order_summary_opened',
  'order_submitted',
  'template_used',
  'history_order_used',
  'recommendations_shown',
  'recommendation_added',
]);

const DEVICE_TYPES = new Set(['mobile', 'tablet', 'desktop', 'unknown']);
const SOURCES = new Set(['catalog', 'template', 'history', 'latest_order', 'recommendation']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getAuthenticatedUser = async () => {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set() {},
        remove() {},
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  return error ? null : user;
};

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    const body = await request.json();
    const eventName = typeof body.eventName === 'string' ? body.eventName : '';
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
    const journeyId = typeof body.journeyId === 'string' ? body.journeyId : '';
    const deviceType = DEVICE_TYPES.has(body.deviceType) ? body.deviceType : 'unknown';
    const source = SOURCES.has(body.source) ? body.source : null;
    const itemCount = Number.isInteger(body.itemCount)
      ? Math.min(10000, Math.max(0, body.itemCount))
      : null;

    if (!EVENT_NAMES.has(eventName) || !UUID_PATTERN.test(sessionId) || !UUID_PATTERN.test(journeyId)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const hashSecret = process.env.ANALYTICS_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!hashSecret) {
      console.error('Analytics event rejected: no server-side hashing secret is configured.');
      return NextResponse.json({ ok: false }, { status: 503 });
    }

    const actorKey = createHmac('sha256', hashSecret).update(user.id).digest('hex');

    await prisma.analyticsEvent.create({
      data: {
        event_name: eventName,
        actor_key: actorKey,
        session_id: sessionId,
        journey_id: journeyId,
        device_type: deviceType,
        source,
        item_count: itemCount,
      },
    });

    return NextResponse.json({ ok: true }, {
      status: 202,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Analytics event error:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
