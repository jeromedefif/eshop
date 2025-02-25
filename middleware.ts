import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  try {
    const { supabase, response } = await createMiddlewareClient(request)
    await supabase.auth.getSession()

    // Přidání jazykových hlaviček do každé odpovědi
    const newResponse = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    // Nastavení jazykových hlaviček
    newResponse.headers.set('Content-Language', 'cs-CZ');
    newResponse.headers.set('X-Content-Language', 'cs-CZ');

    return newResponse;
  } catch (error) {
    console.error('Middleware error:', error)

    // V případě chyby také nastavit hlavičky
    const response = NextResponse.next()
    response.headers.set('Content-Language', 'cs-CZ');
    response.headers.set('X-Content-Language', 'cs-CZ');

    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
