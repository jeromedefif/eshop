import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

type Params = {
  params: {
    id: string;
  };
};

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

export async function GET(_request: NextRequest, { params }: Params) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Nemáte oprávnění zobrazit interní poznámku.' }, { status: 403 });
  }

  try {
    const internalNote = await prisma.orderInternalNote.findUnique({
      where: { order_id: params.id },
      select: { note: true, updated_at: true },
    });

    return NextResponse.json({
      note: internalNote?.note || '',
      updatedAt: internalNote?.updated_at || null,
    }, {
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    });
  } catch (error) {
    console.error('Error fetching internal order note:', error);
    return NextResponse.json({ error: 'Nepodařilo se načíst interní poznámku.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Nemáte oprávnění upravit interní poznámku.' }, { status: 403 });
  }

  try {
    const payload = await request.json();
    if (typeof payload.note !== 'string') {
      return NextResponse.json({ error: 'Interní poznámka musí být text.' }, { status: 400 });
    }

    const note = payload.note.trim();
    if (note.length > 5000) {
      return NextResponse.json({ error: 'Interní poznámka může mít nejvýše 5 000 znaků.' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!order) {
      return NextResponse.json({ error: 'Objednávka nebyla nalezena.' }, { status: 404 });
    }

    if (!note) {
      await prisma.orderInternalNote.deleteMany({ where: { order_id: params.id } });
      return NextResponse.json({ note: '', updatedAt: null });
    }

    const internalNote = await prisma.orderInternalNote.upsert({
      where: { order_id: params.id },
      create: { order_id: params.id, note },
      update: { note, updated_at: new Date() },
      select: { note: true, updated_at: true },
    });

    return NextResponse.json({ note: internalNote.note, updatedAt: internalNote.updated_at });
  } catch (error) {
    console.error('Error updating internal order note:', error);
    return NextResponse.json({ error: 'Nepodařilo se uložit interní poznámku.' }, { status: 500 });
  }
}
