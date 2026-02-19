import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET() {
  try {
    const users = await prisma.$queryRaw<
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
      ORDER BY p.created_at DESC
    `;

    return NextResponse.json(users, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json(
      { error: 'Nepodařilo se načíst uživatele' },
      { status: 500 }
    );
  }
}
