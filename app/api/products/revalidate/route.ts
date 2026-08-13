import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

async function isAdmin() {
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
                remove() {}
            }
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

export async function POST() {
    if (!(await isAdmin())) {
        return NextResponse.json({ error: 'Nemáte oprávnění obnovit veřejný katalog.' }, { status: 403 });
    }

    revalidateTag('public-products');
    revalidatePath('/produkty/[slug]', 'page');
    revalidatePath('/sitemap.xml');

    return NextResponse.json({ revalidated: true });
}
