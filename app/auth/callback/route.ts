import { createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
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

    // Pokud jde o verifikaci emailu, přesměrovat na přihlašovací stránku s parametrem verified=true
    if (type === 'email_change' || type === 'signup' || type === 'recovery') {
      return NextResponse.redirect(`${requestUrl.origin}/login?verified=true`)
    }
  }

  // Pro ostatní případy nebo když není code, přesměrovat na výchozí stránku
  return NextResponse.redirect(`${requestUrl.origin}/login?callback=true`)
}
