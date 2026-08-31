import Link from 'next/link';
import { ExternalLink, LogIn } from 'lucide-react';
import { SITE_CONTAINER_CLASS } from '@/lib/layout';

type PublicHeaderProps = {
    active?: 'catalog' | 'login' | 'register';
};

const navigationClass = (isActive: boolean) =>
    `border-b-2 py-2 transition ${
        isActive
            ? 'border-blue-700 text-slate-950'
            : 'border-transparent hover:border-slate-300 hover:text-slate-950'
    }`;

export default function PublicHeader({ active = 'catalog' }: PublicHeaderProps) {
    return (
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
            <div className={`${SITE_CONTAINER_CLASS} flex min-h-20 items-center justify-between gap-4`}>
                <Link href="/produkty" className="group shrink-0" aria-label="Beginy.cz – veřejný katalog">
                    <span className="block text-lg font-bold leading-tight tracking-tight text-slate-950 group-hover:text-blue-800 sm:text-xl">
                        VINARIA s.r.o.
                    </span>
                    <span className="block text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                        Beginy.cz
                    </span>
                </Link>

                <nav aria-label="Veřejná navigace" className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
                    <Link href="/produkty" className={navigationClass(active === 'catalog')}>
                        Sortiment
                    </Link>
                    <a href="https://vinaria.cz/" className="inline-flex items-center gap-1.5 border-b-2 border-transparent py-2 transition hover:border-slate-300 hover:text-slate-950">
                        O společnosti
                        <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <Link href="/register" className={navigationClass(active === 'register')}>
                        Registrace
                    </Link>
                </nav>

                <Link
                    href="/login"
                    aria-current={active === 'login' ? 'page' : undefined}
                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        active === 'login'
                            ? 'border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100'
                            : 'bg-blue-700 text-white hover:bg-blue-800'
                    }`}
                >
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:inline">Přihlásit do B2B</span>
                    <span className="sm:hidden">Přihlásit</span>
                </Link>
            </div>
        </header>
    );
}
