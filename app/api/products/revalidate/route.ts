import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';
export async function POST() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  revalidateTag('public-products', { expire: 0 });
  revalidatePath('/produkty', 'layout');
  revalidatePath('/sitemap.xml');
  return NextResponse.json({ revalidated: true });
}
