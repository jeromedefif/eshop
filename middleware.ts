import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  try {
    const { supabase, response } = await createMiddlewareClient(request)
    await supabase.auth.getSession()

    const newResponse = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    newResponse.headers.set('Content-Language', 'cs-CZ');
    newResponse.headers.set('Accept-Language', 'cs-CZ');
    newResponse.headers.set('X-Content-Language', 'cs-CZ');
    newResponse.headers.set('X-Google-NoTranslate', 'true');
    newResponse.headers.set('Cache-Control', 'no-store');
    newResponse.headers.set('Vary', 'Accept-Language');

    return newResponse;
  } catch (error) {
    console.error('Middleware error:', error)

    const response = NextResponse.next()
    response.headers.set('Content-Language', 'cs-CZ');
    response.headers.set('Accept-Language', 'cs-CZ');
    response.headers.set('X-Content-Language', 'cs-CZ');
    response.headers.set('X-Google-NoTranslate', 'true');

    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
