import { ArrowLeft, ArrowRight, Trophy } from 'lucide-react';

const top10ButtonClass = 'inline-flex min-h-11 w-full items-center justify-between gap-4 rounded-xl border border-[#d6bcbf] bg-[#fffaf8] px-4 py-2.5 text-sm font-semibold text-[#811633] hover:bg-[#f4e6ea] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8e1437] sm:w-auto sm:shrink-0';

export function Top10Invitation({ onOpen }: { onOpen: () => void }) {
  return <section aria-label="Objevte TOP 10" className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[#e2d7c4] bg-[linear-gradient(115deg,#fffdf8,#f4eee2)] p-4 shadow-sm sm:gap-4 sm:px-5">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e2d0ae] bg-[#eee2cc] text-[#916627]"><Trophy aria-hidden="true" className="h-6 w-6" /></div>
    <div className="min-w-0 flex-1"><h2 className="text-sm font-bold text-slate-900 sm:text-base">Co nejvíc objednávají ostatní?</h2><p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">Inspirujte se výběrem vín a nápojů na Beginy.cz.</p></div>
    <button id="catalog-top10-trigger" type="button" onClick={onOpen} className={top10ButtonClass}>Zobrazit TOP 10<ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
  </section>;
}
export function Top10Context({ onBack, loading, error, onRetry }: { onBack: () => void; loading: boolean; error: string; onRetry: () => void }) {
  return <section aria-label="Přehled TOP 10" className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[#e2d7c4] bg-[linear-gradient(115deg,#fffdf8,#f4eee2)] p-4 shadow-sm sm:gap-4 sm:px-5">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e2d0ae] bg-[#eee2cc] text-[#916627]"><Trophy aria-hidden="true" className="h-6 w-6" /></div>
    <div className="min-w-0 flex-1">
      <h1 id="catalog-title" tabIndex={-1} className="text-lg font-bold text-slate-900">TOP 10 na Beginy.cz</h1>
      <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">Nejobjednávanější vína a nápoje za posledních 90 dní.</p>
    </div>
    <button type="button" onClick={onBack} className={top10ButtonClass}><ArrowLeft aria-hidden="true" className="h-4 w-4" />Zpět na celý katalog</button>
    {loading && <p role="status" className="w-full text-sm text-slate-600">Načítáme TOP 10…</p>}
    {error && <p role="alert" className="w-full text-sm text-red-800">{error} <button type="button" onClick={onRetry} className="min-h-11 underline">Zkusit znovu</button></p>}
  </section>;
}
export function Top10Rank({ rank }: { rank: number }) {
  return <span aria-label={`${rank}. místo v TOP 10`} className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold tabular-nums ${rank <= 3 ? 'border-[#e8d5ab] bg-[#f8eed9] text-[#805b20]' : 'border-[#eadde0] bg-[#f5eff0] text-[#8a5e6a]'}`}>{String(rank).padStart(2, '0')}</span>;
}
