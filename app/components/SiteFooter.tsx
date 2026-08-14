import Link from 'next/link';
import { ExternalLink, Mail, Phone } from 'lucide-react';

export default function SiteFooter() {
    return (
        <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
            <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
                <div>
                    <p className="text-lg font-bold tracking-tight text-white">VINARIA s.r.o.</p>
                    <p className="mt-1 text-sm font-semibold text-blue-300">Beginy.cz</p>
                    <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
                        Velkoobchodní objednávkový systém pro vína, nápoje a související sortiment.
                    </p>
                </div>

                <nav aria-label="Navigace v patičce">
                    <p className="text-sm font-bold uppercase tracking-wider text-white">Katalogy</p>
                    <div className="mt-4 flex flex-col items-start gap-3 text-sm">
                        <Link href="/" className="transition hover:text-white">Objednávkový katalog</Link>
                        <Link href="/produkty" className="transition hover:text-white">Veřejný katalog</Link>
                        <Link href="/login" className="transition hover:text-white">Přihlášení</Link>
                    </div>
                </nav>

                <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-white">Kontakt</p>
                    <div className="mt-4 flex flex-col items-start gap-3 text-sm">
                        <a href="mailto:fiala@vinaria.cz" className="inline-flex items-center gap-2 transition hover:text-white">
                            <Mail className="h-4 w-4" />
                            fiala@vinaria.cz
                        </a>
                        <a href="tel:+420734720994" className="inline-flex items-center gap-2 transition hover:text-white">
                            <Phone className="h-4 w-4" />
                            +420 734 720 994
                        </a>
                        <a href="https://vinaria.cz/" className="inline-flex items-center gap-2 transition hover:text-white">
                            vinaria.cz
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-800">
                <div className="mx-auto max-w-7xl px-5 py-4 text-xs text-slate-500">
                    © {new Date().getFullYear()} VINARIA s.r.o. Všechna práva vyhrazena.
                </div>
            </div>
        </footer>
    );
}
