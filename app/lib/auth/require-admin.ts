import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export async function requireAdmin() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    console.warn('Admin authorization failed', {
      reason: error?.code || 'missing_user',
    });
    return null;
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { is_admin: true },
  });

  if (!profile?.is_admin) {
    console.warn('Admin authorization failed', { reason: 'not_admin' });
    return null;
  }

  return user;
}
