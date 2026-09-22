import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const PASSWORD_RECOVERY_TOKEN_COOKIE = 'beginy-password-recovery-token'
const PASSWORD_RECOVERY_USER_COOKIE = 'beginy-password-recovery-user'
const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
}

export const dynamic = 'force-dynamic'

function createRedirect(requestUrl: URL, path: string) {
  return NextResponse.redirect(new URL(path, requestUrl.origin), {
    status: 303,
    headers: NO_STORE_HEADERS,
  })
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)
  const cookieStore = await cookies()
  const tokenHash = cookieStore.get(PASSWORD_RECOVERY_TOKEN_COOKIE)?.value

  if (!tokenHash) {
    return createRedirect(requestUrl, '/reset-password/confirm?error=missing')
  }

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

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'recovery',
  })

  if (error || !data.user) {
    console.error('Password recovery token verification failed:', error?.message)
    cookieStore.set(PASSWORD_RECOVERY_TOKEN_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    })
    return createRedirect(requestUrl, '/reset-password/confirm?error=invalid')
  }

  cookieStore.set(PASSWORD_RECOVERY_TOKEN_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  cookieStore.set(PASSWORD_RECOVERY_USER_COOKIE, data.user.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 15 * 60,
  })

  return createRedirect(requestUrl, '/reset-password')
}
