import { NextResponse } from 'next/server';
import { deliverWelcomeEmails } from '@/lib/email/welcome-delivery';
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await deliverWelcomeEmails());
}
