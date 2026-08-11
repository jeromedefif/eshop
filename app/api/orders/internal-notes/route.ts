import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

async function requireAdmin() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return false;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  return !profileError && profile?.is_admin === true;
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: 'Nemáte oprávnění zobrazit interní poznámky.' },
      { status: 403 }
    );
  }

  try {
    const payload = await request.json();
    if (!Array.isArray(payload.orderIds)) {
      return NextResponse.json({ error: 'Chybí seznam objednávek.' }, { status: 400 });
    }

    const orderIds = Array.from(new Set(
      payload.orderIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    )).slice(0, 1000);

    if (orderIds.length === 0) {
      return NextResponse.json({ notes: [] });
    }

    const notes = await prisma.orderInternalNote.findMany({
      where: { order_id: { in: orderIds } },
      select: { order_id: true, note: true, updated_at: true },
    });

    return NextResponse.json({ notes }, {
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    });
  } catch (error) {
    console.error('Error fetching internal order notes:', error);
    return NextResponse.json({ error: 'Nepodařilo se načíst interní poznámky.' }, { status: 500 });
  }
}
