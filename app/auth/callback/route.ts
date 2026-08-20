import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const PASSWORD_RECOVERY_COOKIE = 'beginy-password-recovery-user'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  // Získání typu akce z URL parametrů (může být signup, recovery, invite atd.)
  const type = requestUrl.searchParams.get('type')

  const isLocalRequest = ['localhost', '127.0.0.1'].includes(requestUrl.hostname)
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  // Lokálně zachováme i aktuální port. V produkci používáme kanonickou doménu.
  const BASE_URL = isLocalRequest
    ? requestUrl.origin
    : configuredSiteUrl || requestUrl.origin

  console.log(`Auth callback processing - type: ${type}, code present: ${Boolean(code)}`)
  console.log(`Using base URL for redirects: ${BASE_URL}`)

  if (code) {
    try {
      const cookieStore = cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            },
          },
        }
      )

      // Výměna kódu za session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Error exchanging code for session:', error.message)
        // Přesměrujeme na login s parametrem chyby
        return NextResponse.redirect(`${BASE_URL}/login?error=auth_error`)
      }

      console.log('Session exchange successful, user ID:', data?.session?.user.id)

      // DŮLEŽITÉ: Pokud jde o reset hesla, přesměrujeme přímo bez ohledu na typ
      // To vyřeší případy, kdy typ není správně předán v URL
      if (type === 'recovery' || requestUrl.toString().includes('recovery')) {
        console.log('Redirecting to reset-password page')
        cookieStore.set(PASSWORD_RECOVERY_COOKIE, data.session.user.id, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          maxAge: 15 * 60,
        })
        return NextResponse.redirect(`${BASE_URL}/reset-password`)
      }

      // Pokud je typ verifikace email nebo signup (registrace), přesměrujeme na přihlašovací stránku s verified=true
      if (type === 'signup' || type === 'email') {
        console.log('Redirecting to login with verified=true')
        return NextResponse.redirect(`${BASE_URL}/login?verified=true`)
      }
    } catch (error) {
      console.error('Unexpected error in auth callback:', error)
      return NextResponse.redirect(`${BASE_URL}/login?error=server_error`)
    }
  } else {
    console.log('No code provided in callback')
  }

  // Pro jiné typy callbacků nebo pokud není kód, přesměrujeme na výchozí stránku
  console.log('Redirecting to homepage')
  return NextResponse.redirect(BASE_URL)
}
