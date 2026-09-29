import { Check } from 'lucide-react';

export default function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Průběh objednávky" className="mb-6 grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {['Souhrn', 'Kontrola a odeslání', 'Přijato'].map((label, index) => {
        const active = current === index + 1;
        const done = current > index + 1;
        return (
          <li key={label} aria-current={active ? 'step' : undefined}
            className={`flex flex-col items-center justify-center gap-2 border-b-2 px-2 py-3 text-center text-xs font-semibold sm:flex-row sm:gap-3 sm:py-4 sm:text-sm ${active ? 'border-blue-600 bg-blue-50/60 text-blue-800' : 'border-transparent text-slate-500'}`}>
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${active ? 'bg-blue-700 text-white shadow-sm' : done ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
              {done ? <Check aria-hidden="true" className="h-4 w-4" /> : index + 1}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
