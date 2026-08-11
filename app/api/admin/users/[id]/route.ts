import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
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
  if (userError || !user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { is_admin: true },
  });

  return profile?.is_admin ? user : null;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const userRows = await prisma.$queryRaw<
      Array<{
        id: string;
        email: string | null;
        full_name: string | null;
        company: string | null;
        phone: string | null;
        address: string | null;
        city: string | null;
        postal_code: string | null;
        is_admin: boolean;
        created_at: Date;
        updated_at: Date;
        last_sign_in_at: Date | null;
      }>
    >`
      SELECT
        p.id,
        p.email,
        p.full_name,
        p.company,
        p.phone,
        p.address,
        p.city,
        p.postal_code,
        p.is_admin,
        p.created_at,
        p.updated_at,
        u.last_sign_in_at
      FROM public.profiles p
      LEFT JOIN auth.users u ON u.id = p.id
      WHERE p.id = ${params.id}::uuid
      LIMIT 1
    `;

    if (!userRows.length) {
      return NextResponse.json(
        { error: 'Uživatel nebyl nalezen' },
        { status: 404 }
      );
    }

    return NextResponse.json(userRows[0], {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Error fetching admin user detail:', error);
    return NextResponse.json(
      { error: 'Nepodařilo se načíst detail uživatele' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const currentAdmin = await requireAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ error: 'Nemáte oprávnění smazat uživatele.' }, { status: 403 });
  }

  if (currentAdmin.id === params.id) {
    return NextResponse.json({ error: 'Nemůžete smazat svůj vlastní účet.' }, { status: 400 });
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { id: params.id },
      select: { id: true, is_admin: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Uživatel nebyl nalezen.' }, { status: 404 });
    }

    if (profile.is_admin) {
      return NextResponse.json({ error: 'Administrátorský účet nelze smazat.' }, { status: 400 });
    }

    const orderCount = await prisma.order.count({ where: { user_id: params.id } });
    if (orderCount > 0) {
      return NextResponse.json(
        { error: 'Uživatele nelze smazat, protože již vytvořil objednávku.' },
        { status: 409 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase service role configuration for deleting users');
      return NextResponse.json({ error: 'Mazání uživatelů není na serveru nakonfigurováno.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(params.id);
    if (deleteAuthError) {
      console.error('Error deleting Supabase auth user:', deleteAuthError);
      return NextResponse.json({ error: 'Nepodařilo se odstranit přihlašovací účet uživatele.' }, { status: 500 });
    }

    // Ve standardním Supabase schématu profil odstraní databázová vazba. Toto je
    // bezpečné dočištění pro případ, že by profil po odstranění Auth účtu zůstal.
    await prisma.profile.deleteMany({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting admin user:', error);
    return NextResponse.json({ error: 'Nepodařilo se smazat uživatele.' }, { status: 500 });
  }
}
