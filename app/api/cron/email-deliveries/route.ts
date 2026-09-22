import { NextResponse } from 'next/server';
import { deliverPendingEmails } from '@/lib/email/delivery';
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await deliverPendingEmails());
}
