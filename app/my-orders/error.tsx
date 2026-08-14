'use client';

import { AlertTriangle } from 'lucide-react';
import CustomerPageState from '@/components/CustomerPageState';

export default function MyOrdersError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <CustomerPageState
      title="Nepodařilo se načíst vaše objednávky"
      description="Došlo k neočekávané chybě. Vaše uložené objednávky tím nejsou ovlivněné."
    >
        <AlertTriangle className="mx-auto h-10 w-10 text-red-500" aria-hidden="true" />
        <button
          onClick={reset}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Zkusit znovu
        </button>
    </CustomerPageState>
  );
}
