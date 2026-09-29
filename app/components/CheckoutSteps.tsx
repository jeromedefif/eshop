export default function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  return <ol aria-label="Průběh objednávky" className="mb-6 grid grid-cols-3 gap-2">
    {['Souhrn', 'Kontrola a odeslání', 'Přijato'].map((label, index) => <li key={label} aria-current={current === index + 1 ? 'step' : undefined}
      className={`flex flex-col items-center gap-2 rounded-xl px-2 py-3 text-center text-sm font-semibold ${index + 1 === current ? 'bg-blue-50 text-blue-800' : index + 1 < current ? 'text-green-800' : 'text-slate-500'}`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${index + 1 <= current ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'}`}>{index + 1}</span>{label}
    </li>)}
  </ol>;
}
