import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const PASSWORD_RECOVERY_COOKIE = 'beginy-password-recovery-user'
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' }

function clearRecoveryCookie(cookieStore: ReturnType<typeof cookies>) {
  cookieStore.set(PASSWORD_RECOVERY_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

function createSupabaseClient(cookieStore: ReturnType<typeof cookies>) {
  return createServerClient(
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
}

async function getVerifiedRecoveryUser() {
  const cookieStore = cookies()
  const expectedUserId = cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value

  if (!expectedUserId) {
    return { cookieStore, user: null }
  }

  const supabase = createSupabaseClient(cookieStore)
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user || data.user.id !== expectedUserId) {
    clearRecoveryCookie(cookieStore)
    return { cookieStore, user: null }
  }

  return { cookieStore, supabase, user: data.user }
}

export async function GET() {
  const { user } = await getVerifiedRecoveryUser()

  if (!user) {
    return NextResponse.json(
      { valid: false, error: 'Recovery relace není platná.' },
      { status: 401, headers: NO_STORE_HEADERS }
    )
  }

  return NextResponse.json({ valid: true }, { headers: NO_STORE_HEADERS })
}

export async function POST(request: Request) {
  const { cookieStore, supabase, user } = await getVerifiedRecoveryUser()

  if (!user || !supabase) {
    return NextResponse.json(
      { success: false, error: 'Recovery relace není platná nebo vypršela.' },
      { status: 401, headers: NO_STORE_HEADERS }
    )
  }

  let password = ''
  try {
    const body = await request.json()
    password = typeof body.password === 'string' ? body.password : ''
  } catch {
    return NextResponse.json(
      { success: false, error: 'Neplatný požadavek.' },
      { status: 400, headers: NO_STORE_HEADERS }
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { success: false, error: 'Heslo musí mít alespoň 6 znaků.' },
      { status: 400, headers: NO_STORE_HEADERS }
    )
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error('Password recovery update failed:', error.message)
    return NextResponse.json(
      { success: false, error: 'Heslo se nepodařilo změnit. Vyžádejte si nový odkaz.' },
      { status: 400, headers: NO_STORE_HEADERS }
    )
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
  if (signOutError) {
    console.error('Password recovery sign-out failed:', signOutError.message)
  }
  clearRecoveryCookie(cookieStore)

  return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS })
}
