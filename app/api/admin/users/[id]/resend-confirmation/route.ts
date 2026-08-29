import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/require-admin';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

type Params = {
  params: {
    id: string;
  };
};

export async function POST(_request: Request, { params }: Params) {
  const currentAdmin = await requireAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ error: 'Nemáte oprávnění odesílat aktivační e-maily.' }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error('Missing Supabase configuration for resending signup confirmation');
    return NextResponse.json({ error: 'Odesílání aktivačních e-mailů není nakonfigurováno.' }, { status: 500 });
  }

  const users = await prisma.$queryRaw<
    Array<{ email: string | null; email_confirmed_at: Date | null }>
  >`
    SELECT u.email, u.email_confirmed_at
    FROM auth.users u
    INNER JOIN public.profiles p ON p.id = u.id
    WHERE u.id = ${params.id}::uuid
    LIMIT 1
  `;
  const authUser = users[0];

  if (!authUser?.email) {
    return NextResponse.json({ error: 'Přihlašovací účet uživatele nebyl nalezen.' }, { status: 404 });
  }

  if (authUser.email_confirmed_at) {
    return NextResponse.json({ error: 'Účet je již aktivní.' }, { status: 409 });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.beginy.cz').replace(/\/$/, '');

  const { error: resendError } = await supabase.auth.resend({
    type: 'signup',
    email: authUser.email,
    options: {
      emailRedirectTo: `${siteUrl}/login?verified=true`,
    },
  });

  if (resendError) {
    console.error('Unable to resend signup confirmation:', resendError);
    const isRateLimited = resendError.status === 429;
    return NextResponse.json(
      {
        error: isRateLimited
          ? 'Aktivační e-mail byl odeslán příliš nedávno. Zkuste to prosím později.'
          : 'Aktivační e-mail se nepodařilo odeslat.',
      },
      { status: isRateLimited ? 429 : 502 }
    );
  }

  return NextResponse.json({ success: true });
}
