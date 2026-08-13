import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isPublicSeoRoute = pathname.startsWith('/produkty/')
    || pathname === '/robots.txt'
    || pathname === '/sitemap.xml'

  if (isPublicSeoRoute) {
    return NextResponse.next()
  }

  try {
    const { supabase, response } = await createMiddlewareClient(request)
    await supabase.auth.getSession()

    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
