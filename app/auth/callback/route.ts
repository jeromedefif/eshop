import { createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (data?.user) {
      // Zkontrolujeme, zda profil existuje
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      // Pokud profil neexistuje, vytvoříme ho
      if (!profileData) {
        // Získáme metadata z uživatele
        const metadata = data.user.user_metadata;

        // Vytvoříme profil s daty z user_metadata
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{
            id: data.user.id,
            email: data.user.email,
            full_name: metadata?.full_name,
            company: metadata?.company,
            phone: metadata?.phone,
            address: metadata?.address,
            city: metadata?.city,
            postal_code: metadata?.postal_code,
            is_admin: metadata?.is_admin || false
          }]);

        if (insertError) {
          console.error('Error creating profile:', insertError);
        }
      }
    }
  }

  return NextResponse.redirect(requestUrl.origin)
}
