import { Check } from 'lucide-react';

interface CheckoutStepsProps {
  current: 1 | 2 | 3;
  onSummary?: () => void;
  onReview?: () => void;
  reviewDisabled?: boolean;
}

export default function CheckoutSteps({ current, onSummary, onReview, reviewDisabled }: CheckoutStepsProps) {
  return (
    <ol aria-label="Průběh objednávky" className="mb-6 grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {['Souhrn objednávky', 'Kontrola a odeslání', 'Přijato'].map((label, index) => {
        const active = current === index + 1;
        const done = current > index + 1;
        const action = current === 3 || active ? undefined : index === 0 ? onSummary : index === 1 ? onReview : undefined;
        const content = <>
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${active ? 'bg-blue-700 text-white shadow-sm' : done ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
            {done ? <Check aria-hidden="true" className="h-4 w-4" /> : index + 1}
          </span>
          {label}
        </>;
        const layout = 'flex h-full w-full flex-col items-center justify-center gap-2 px-2 py-3 sm:flex-row sm:gap-3 sm:py-4';
        return (
          <li key={label} aria-current={active ? 'step' : undefined}
            className={`border-b-2 text-center text-xs font-semibold sm:text-sm ${active ? 'border-blue-600 bg-blue-50/60 text-blue-800' : 'border-transparent text-slate-500'}`}>
            {action ? <button type="button" onClick={action} disabled={index === 1 && reviewDisabled}
              className={`${layout} text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent`}>
              {content}
            </button> : <span className={layout}>{content}</span>}
          </li>
        );
      })}
    </ol>
  );
}
