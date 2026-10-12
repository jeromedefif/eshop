import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import prisma from '@/lib/prisma';
import { welcomeHtml, welcomeSubject, welcomeText } from './welcome-template';

export async function deliverWelcomeEmails() {
  if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL) throw new Error('E-mailová služba není nakonfigurována.');
  // Registration cutoff lives in the database: old accounts are never backfilled.
  await prisma.$executeRaw`
    INSERT INTO public.welcome_email_deliveries (user_id)
    SELECT u.id FROM auth.users u CROSS JOIN public.welcome_email_settings s
    WHERE s.enabled_at IS NOT NULL AND u.created_at >= s.enabled_at
      AND u.email_confirmed_at IS NOT NULL AND u.email IS NOT NULL AND u.email <> ''
      AND u.deleted_at IS NULL AND u.is_anonymous IS NOT TRUE
    ON CONFLICT (user_id) DO NOTHING
  `;
  await prisma.$executeRaw`
    UPDATE public.welcome_email_deliveries SET status = 'review', last_error = 'Vypršelo bezpečné okno opakování; ověřte přijetí u poskytovatele.'
    WHERE status IN ('pending','failed','sending') AND first_attempt_at < now() - interval '23 hours'
  `;
  const token = randomUUID();
  const jobs = await prisma.$queryRaw<Array<{ user_id: string; id: string; attempts: number }>>`
    UPDATE public.welcome_email_deliveries SET status = 'sending', claim_token = ${token}::uuid,
      claimed_at = now(), first_attempt_at = coalesce(first_attempt_at, now()), attempts = attempts + 1
    WHERE user_id IN (
      SELECT user_id FROM public.welcome_email_deliveries
      WHERE ((status IN ('pending','failed') AND next_attempt_at <= now()) OR
        (status = 'sending' AND claimed_at < now() - interval '5 minutes')) AND attempts < 8
        AND EXISTS (SELECT 1 FROM public.welcome_email_settings WHERE enabled_at IS NOT NULL)
      ORDER BY next_attempt_at LIMIT 10 FOR UPDATE SKIP LOCKED
    ) RETURNING user_id, id, attempts
  `;
  for (const job of jobs) {
    try {
      // Recipient comes exclusively from verified Auth data, never request input.
      const users = await prisma.$queryRaw<Array<{ email: string }>>`
        SELECT email FROM auth.users WHERE id = ${job.user_id}::uuid AND email_confirmed_at IS NOT NULL AND deleted_at IS NULL
      `;
      if (!users[0]?.email) throw new Error('Chybí potvrzená e-mailová adresa.');
      const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.FROM_EMAIL, to: users[0].email, replyTo: 'fiala@vinaria.cz',
        subject: welcomeSubject, html: welcomeHtml, text: welcomeText,
      }, { idempotencyKey: `welcome/${job.id}` });
      if (result.error || !result.data?.id) throw new Error(result.error?.message || 'Poskytovatel nepotvrdil přijetí.');
      await prisma.$executeRaw`
        UPDATE public.welcome_email_deliveries SET status = 'sent', sent_at = now(), provider_id = ${result.data.id}, claim_token = NULL, last_error = NULL
        WHERE user_id = ${job.user_id}::uuid AND claim_token = ${token}::uuid
      `;
    } catch (error) {
      const message = (error instanceof Error ? error.message : 'Odeslání selhalo').slice(0, 500);
      const retryAt = new Date(Date.now() + Math.min(3600, 30 * 2 ** job.attempts) * 1000);
      await prisma.$executeRaw`
        UPDATE public.welcome_email_deliveries SET status = ${job.attempts >= 8 ? 'review' : 'failed'},
          last_error = ${message}, next_attempt_at = ${retryAt}, claim_token = NULL
        WHERE user_id = ${job.user_id}::uuid AND claim_token = ${token}::uuid
      `;
    }
  }
  return { processed: jobs.length };
}
