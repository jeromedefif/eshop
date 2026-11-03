import { ArrowLeft } from 'lucide-react';

const top10ButtonClass = 'inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d6bcbf] bg-[#fffaf8] px-3 text-sm font-semibold text-[#811633] hover:bg-[#f4e6ea] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8e1437]';

export function Top10Context({ onBack, loading, error, onRetry }: { onBack: () => void; loading: boolean; error: string; onRetry: () => void }) {
  return <section aria-label="Přehled TOP 10" className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
