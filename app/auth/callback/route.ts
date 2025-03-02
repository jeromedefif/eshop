import { createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  // Získání typu akce z URL parametrů (může být signup, recovery, invite atd.)
  const type = requestUrl.searchParams.get('type')

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

    await supabase.auth.exchangeCodeForSession(code)

    // Pokud je typ verifikace email nebo signup (registrace), přesměrujeme na přihlašovací stránku
    if (type === 'signup' || type === 'email') {
      return NextResponse.redirect(`${requestUrl.origin}/login?verified=true`)
    }
  }

  // Pro jiné typy callbacků nebo pokud není kód, přesměrujeme na výchozí stránku
  return NextResponse.redirect(`${requestUrl.origin}`)
}
