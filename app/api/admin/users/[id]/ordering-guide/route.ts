import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import prisma from '@/lib/prisma';
import { reminderHtml, reminderSubject } from '@/lib/email/welcome-template';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, props: Props) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Nemáte oprávnění.' }, { status: 403 });
  const { id } = await props.params;
  if (!uuid.test(id)) return NextResponse.json({ error: 'Neplatné ID.' }, { status: 400 });
  const rows = await prisma.$queryRaw<Array<{ email: string; confirmed: boolean; sent_at: Date | null; status: string | null }>>`
    SELECT u.email, (u.email_confirmed_at IS NOT NULL) AS confirmed, d.sent_at, d.status
    FROM auth.users u LEFT JOIN public.welcome_email_deliveries d ON d.user_id = u.id
    WHERE u.id = ${id}::uuid AND u.deleted_at IS NULL
  `;
  if (!rows[0]) return NextResponse.json({ error: 'Uživatel nenalezen.' }, { status: 404 });
  return NextResponse.json({ ...rows[0], subject: reminderSubject, html: reminderHtml }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function POST(request: Request, props: Props) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Nemáte oprávnění.' }, { status: 403 });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Neplatný původ požadavku.' }, { status: 403 });
  const { id } = await props.params;
  if (!uuid.test(id)) return NextResponse.json({ error: 'Neplatné ID.' }, { status: 400 });
  // One active delivery per customer. A second click cannot enqueue another mail.
  const rows = await prisma.$queryRaw<Array<{ user_id: string }>>`
    INSERT INTO public.welcome_email_deliveries (user_id, manual, requested_by, requested_at)
    SELECT u.id, true, ${admin.id}::uuid, now() FROM auth.users u
    WHERE u.id = ${id}::uuid AND u.email_confirmed_at IS NOT NULL AND u.email IS NOT NULL
      AND u.deleted_at IS NULL AND u.is_anonymous IS NOT TRUE
      AND EXISTS (SELECT 1 FROM public.welcome_email_settings WHERE enabled_at IS NOT NULL)
    ON CONFLICT (user_id) DO UPDATE SET id = gen_random_uuid(), manual = true,
      requested_by = EXCLUDED.requested_by, requested_at = now(), status = 'pending', attempts = 0,
      next_attempt_at = now(), claimed_at = NULL, claim_token = NULL, first_attempt_at = NULL,
      provider_id = NULL, last_error = NULL
    WHERE welcome_email_deliveries.status = 'sent' AND welcome_email_deliveries.sent_at < now() - interval '5 minutes'
    RETURNING user_id
  `;
  if (!rows.length) return NextResponse.json({ error: 'Účet musí být potvrzený. Návod již může čekat na odeslání, vyžadovat kontrolu nebo byl odeslán před méně než 5 minutami.' }, { status: 409 });
  return NextResponse.json({ success: true, message: 'Návod je zařazen k odeslání, zpravidla do 5 minut.' }, { status: 202 });
}
