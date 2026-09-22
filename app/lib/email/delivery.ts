import { randomUUID } from 'crypto';
import { Prisma, type EmailDelivery, type PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import prisma from '@/lib/prisma';

export type MailSender = (job: EmailDelivery) => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
const sendMail: MailSender = async (job) => {
  if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL) throw new Error('E-mailová služba není nakonfigurována.');
  return new Resend(process.env.RESEND_API_KEY).emails.send({
    from: process.env.FROM_EMAIL, to: job.recipient, subject: job.subject, html: job.html,
  }, { idempotencyKey: job.id });
};

// Provider idempotency lasts 24 hours. Stop ambiguous retries before that window
// expires: an administrator must reconcile them with the provider, never resend blindly.
export async function deliverPendingEmails(orderId?: string, db: PrismaClient = prisma, sender: MailSender = sendMail) {
  const token = randomUUID();
  const scope = orderId ? Prisma.sql`AND order_id = ${orderId}::uuid` : Prisma.empty;
  await db.$executeRaw`
    UPDATE public.email_deliveries SET status = 'review', last_error = 'Vypršelo bezpečné okno opakování; ověřte doručení u poskytovatele.'
    WHERE status IN ('pending', 'failed', 'sending') AND first_attempt_at < now() - interval '23 hours' ${scope}
  `;
  const jobs = await db.$queryRaw<EmailDelivery[]>`
    UPDATE public.email_deliveries SET status = 'sending', claimed_at = now(), claim_token = ${token}::uuid,
      first_attempt_at = coalesce(first_attempt_at, now()), attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM public.email_deliveries
      WHERE ((status IN ('pending','failed') AND next_attempt_at <= now())
        OR (status = 'sending' AND claimed_at < now() - interval '5 minutes'))
        AND attempts < 8 ${scope}
      ORDER BY created_at LIMIT 10 FOR UPDATE SKIP LOCKED
    ) RETURNING *
  `;
  for (const job of jobs) {
    try {
      const result = await sender(job);
      if (result.error || !result.data?.id) throw new Error(result.error?.message || 'Poskytovatel nepotvrdil přijetí e-mailu.');
      await db.emailDelivery.updateMany({ where: { id: job.id, claim_token: token }, data: {
        status: 'sent', sent_at: new Date(), provider_id: result.data.id, last_error: null, claim_token: null,
      } });
    } catch (error) {
      await db.emailDelivery.updateMany({ where: { id: job.id, claim_token: token }, data: {
        status: job.attempts >= 8 ? 'review' : 'failed',
        last_error: (error instanceof Error ? error.message : 'Odeslání selhalo').slice(0, 500),
        next_attempt_at: new Date(Date.now() + Math.min(3600, 30 * 2 ** job.attempts) * 1000), claim_token: null,
      } });
    }
  }
  return { processed: jobs.length };
}
