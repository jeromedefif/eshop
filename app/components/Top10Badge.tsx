'use client';

import { useDailyTop10 } from '@/hooks/useDailyTop10';

const description = 'Patří mezi 10 nejčastěji objednávaných vín a nápojů na Beginy.cz za posledních 90 dní.';

export function Top10Badge() {
  return <span title={description} className="inline-flex shrink-0 items-center rounded-full border border-[#e8d5ab] bg-[#f8eed9] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-[#805b20]">TOP 10<span className="sr-only"> — {description}</span></span>;
}

// Load independently so the daily ranking never blocks the product detail.
export function ProductTop10Badge({ id, eligible }: { id: string; eligible: boolean }) {
  const { data } = useDailyTop10(eligible);
  return eligible && data?.productIds.includes(id) ? <Top10Badge /> : null;
}
