import { NextResponse } from 'next/server'

const PASSWORD_RECOVERY_TOKEN_COOKIE = 'beginy-password-recovery-token'
const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
}

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const tokenHash = requestUrl.searchParams.get('token_hash')?.trim()
  const confirmationUrl = new URL('/reset-password/confirm', requestUrl.origin)

  if (!tokenHash) {
    confirmationUrl.searchParams.set('error', 'missing')
    return NextResponse.redirect(confirmationUrl, {
      status: 303,
      headers: NO_STORE_HEADERS,
    })
  }

  // A GET request only stores the token. Verification waits for an explicit
  // customer action so email link scanners cannot consume the one-time token.
  const response = NextResponse.redirect(confirmationUrl, {
    status: 303,
    headers: NO_STORE_HEADERS,
  })

  response.cookies.set(PASSWORD_RECOVERY_TOKEN_COOKIE, tokenHash, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60,
  })

  return response
}
