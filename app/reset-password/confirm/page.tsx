import Link from 'next/link'
import { KeyRound, ShieldCheck } from 'lucide-react'
import AuthPageShell from '@/components/AuthPageShell'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Potvrzení obnovení hesla | VINARIA s.r.o.',
  description: 'Bezpečné potvrzení žádosti o obnovení hesla',
  robots: {
    index: false,
    follow: false,
  },
}

type RecoveryConfirmationPageProps = {
  searchParams?: {
    error?: string
  }
}

export default function RecoveryConfirmationPage({
  searchParams,
}: RecoveryConfirmationPageProps) {
  const hasError = searchParams?.error === 'missing' || searchParams?.error === 'invalid'

  return (
    <AuthPageShell active="login" width="md">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
        <div className="text-center">
          <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${hasError ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
            {hasError ? <KeyRound className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
          </div>

          <h1 className="text-2xl font-bold text-slate-950">
            {hasError ? 'Odkaz nelze použít' : 'Obnovení hesla'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {hasError
              ? 'Odkaz je neplatný nebo již vypršel. Vyžádejte si prosím nový e-mail pro obnovení hesla.'
              : 'Pokračujte pouze v případě, že jste o změnu hesla požádali vy. Odkaz bude ověřen až po kliknutí na tlačítko.'}
          </p>
        </div>

        {hasError ? (
          <Link
            href="/forgot-password"
            className="mt-7 flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Vyžádat nový odkaz
          </Link>
        ) : (
          <form action="/api/auth/recovery/confirm" method="post" className="mt-7">
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Pokračovat k nastavení nového hesla
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          Pokud jste o obnovení hesla nežádali, můžete tuto stránku bezpečně zavřít.
        </p>
      </div>
    </AuthPageShell>
  )
}
