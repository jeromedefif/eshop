import Link from 'next/link';
import { ExternalLink, LogIn } from 'lucide-react';

export default function PublicHeader() {
    return (
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
            <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-5">
                <Link href="/produkty" className="group shrink-0" aria-label="Beginy.cz – veřejný katalog">
                    <span className="block text-lg font-bold leading-tight tracking-tight text-slate-950 group-hover:text-blue-800 sm:text-xl">
                        VINARIA s.r.o.
                    </span>
                    <span className="block text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                        Beginy.cz
                    </span>
                </Link>

                <nav aria-label="Veřejná navigace" className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
                    <Link href="/produkty" className="border-b-2 border-blue-700 py-2 text-slate-950">
                        Sortiment
                    </Link>
                    <a href="https://vinaria.cz/" className="inline-flex items-center gap-1.5 py-2 transition hover:text-slate-950">
                        O společnosti
                        <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <Link href="/register" className="py-2 transition hover:text-slate-950">
                        Registrace
                    </Link>
                </nav>

                <Link
                    href="/login"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:inline">Přihlásit do B2B</span>
                    <span className="sm:hidden">Přihlásit</span>
                </Link>
            </div>
        </header>
    );
}
