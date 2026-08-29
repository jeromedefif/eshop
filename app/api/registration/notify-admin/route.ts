import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

type ClaimedProfile = {
  id: string;
  created_at: Date;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(request: Request) {
  const suppliedSecret = request.headers.get('x-registration-webhook-secret');
  if (!suppliedSecret || !/^[0-9a-f]{64}$/i.test(suppliedSecret)) {
    return NextResponse.json({ error: 'Neplatné ověření webhooku.' }, { status: 401 });
  }

  const secretRows = await prisma.$queryRaw<Array<{ valid: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM vault.decrypted_secrets
      WHERE name = 'beginy_registration_webhook_secret'
        AND decrypted_secret = ${suppliedSecret}
    ) AS valid
  `;
  if (!secretRows[0]?.valid) {
    return NextResponse.json({ error: 'Neplatné ověření webhooku.' }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'fiala@vinaria.cz';
  if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL) {
    console.error('Email configuration is missing for registration notifications');
    return NextResponse.json({ error: 'E-mailová služba není nakonfigurována.' }, { status: 503 });
  }

  let profileId: string | undefined;
  try {
    const body = await request.json();
    profileId = body?.record?.id;
  } catch {
    return NextResponse.json({ error: 'Neplatné tělo požadavku.' }, { status: 400 });
  }

  if (!profileId || !UUID_PATTERN.test(profileId)) {
    return NextResponse.json({ error: 'Chybí platné ID profilu.' }, { status: 400 });
  }

  try {
    // Atomic claim prevents duplicate messages if Supabase retries the webhook.
    const claimedProfiles = await prisma.$queryRaw<ClaimedProfile[]>`
      UPDATE public.profiles
      SET admin_registration_notification_status = 'sending',
          admin_registration_notification_attempts = admin_registration_notification_attempts + 1,
          admin_registration_notification_claimed_at = now(),
          admin_registration_notification_error = NULL
      WHERE id = ${profileId}::uuid
        AND admin_registration_notified_at IS NULL
        AND (
          admin_registration_notification_status <> 'sending'
          OR admin_registration_notification_claimed_at IS NULL
          OR admin_registration_notification_claimed_at < now() - interval '10 minutes'
        )
      RETURNING id, created_at
    `;

    const profile = claimedProfiles[0];
    if (!profile) {
      const existing = await prisma.profile.findUnique({
        where: { id: profileId },
        select: { id: true, admin_registration_notified_at: true },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Profil nebyl nalezen.' }, { status: 404 });
      }

      return NextResponse.json({ success: true, alreadyProcessed: true });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.beginy.cz').replace(/\/$/, '');
    const adminDetailUrl = `${siteUrl}/admin/users/${profile.id}`;
    const registeredAt = new Date(profile.created_at).toLocaleString('cs-CZ', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Europe/Prague',
    });
    const html = `
      <html lang="cs">
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
        <body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
          <div style="max-width:680px;margin:0 auto;padding:24px 14px;">
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;">
              <p style="margin:0 0 12px;font-size:13px;color:#64748b;">VINARIA s.r.o. – Beginy.cz</p>
              <h1 style="margin:0;font-size:28px;line-height:1.2;color:#1d4ed8;">Nová registrace zákazníka</h1>
              <p style="margin:12px 0 6px;color:#475569;">V B2B portálu se právě zaregistroval nový zákazník.</p>
              <p style="margin:0 0 20px;color:#64748b;font-size:14px;">Datum registrace: ${escapeHtml(registeredAt)}</p>
              <a href="${escapeHtml(adminDetailUrl)}" style="display:inline-block;padding:12px 18px;border-radius:9px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;">Otevřít chráněný detail zákazníka</a>
              <p style="margin:24px 0 0;padding-top:14px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.5;">Osobní a firemní údaje nejsou z bezpečnostních důvodů součástí e-mailu. Zobrazí se až po přihlášení administrátora.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { error } = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: adminEmail,
      subject: 'Nová registrace zákazníka – Beginy.cz',
      html,
    });

    if (error) throw new Error(error.message);

    await prisma.$executeRaw`
      UPDATE public.profiles
      SET admin_registration_notification_status = 'sent',
          admin_registration_notified_at = now(),
          admin_registration_notification_error = NULL
      WHERE id = ${profile.id}::uuid
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown registration notification error';
    console.error('Failed to send admin registration notification:', message);

    if (profileId && UUID_PATTERN.test(profileId)) {
      try {
        await prisma.$executeRaw`
          UPDATE public.profiles
          SET admin_registration_notification_status = 'failed',
              admin_registration_notification_error = ${message.slice(0, 1000)}
          WHERE id = ${profileId}::uuid
            AND admin_registration_notified_at IS NULL
        `;
      } catch (statusError) {
        console.error('Failed to persist registration notification error:', statusError);
      }
    }

    return NextResponse.json({ error: 'Upozornění se nepodařilo odeslat.' }, { status: 500 });
  }
}
