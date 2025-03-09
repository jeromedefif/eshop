import { createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token = requestUrl.searchParams.get('token')  // NOVÉ: Zkusíme získat token přímo z URL
  const type = requestUrl.searchParams.get('type')

  // Definice pevné základní URL pro přesměrování
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.beginy.cz'

  console.log(`Auth callback processing - URL: ${request.url}`)
  console.log(`Parameters: type=${type}, code=${!!code}, token=${!!token}`)
  console.log(`All params:`, Object.fromEntries(requestUrl.searchParams.entries()))

  try {
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

    // NOVÉ: Pokud máme typ "recovery", zpracujeme resetování hesla speciálně
    if (type === 'recovery') {
      console.log('Recovery flow detected')

      // Pokusíme se získat session - buď pomocí kódu nebo existující session
      let session = null;

      if (code) {
        console.log('Exchanging code for session')
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('Error exchanging code for session:', error.message)
        } else {
          session = data.session
          console.log('Session created successfully')
        }
      } else {
        console.log('No code found, checking existing session')
        const { data } = await supabase.auth.getSession()
        session = data.session
      }

      // Přesměrujeme přímo na stránku pro reset hesla
      console.log('Redirecting to reset-password, session exists:', !!session)

      // Použijeme relativní URL a zajistíme zachování cookies
      return NextResponse.redirect(new URL('/reset-password', request.url))
    }

    // Pro ostatní typy pokračujeme standardním způsobem
    if (code) {
      console.log('Processing authentication code')
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Error exchanging code for session:', error.message)
        return NextResponse.redirect(`${BASE_URL}/login?error=auth_error`)
      }

      console.log('Session exchange successful, user ID:', data?.session?.user.id)

      // Pokud je typ verifikace email nebo signup (registrace)
      if (type === 'signup' || type === 'email') {
        console.log('Redirecting to login with verified=true')
        return NextResponse.redirect(`${BASE_URL}/login?verified=true`)
      }
    } else {
      console.log('No authentication code found')
    }
  } catch (error) {
    console.error('Unexpected error in auth callback:', error)
    return NextResponse.redirect(`${BASE_URL}/login?error=server_error`)
  }

  // Pro jiné typy callbacků nebo pokud není kód, přesměrujeme na výchozí stránku
  console.log('No specific action taken, redirecting to homepage')
  return NextResponse.redirect(BASE_URL)
}
