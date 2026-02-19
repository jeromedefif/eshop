import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

type Params = {
  params: {
    id: string;
  };
};

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
