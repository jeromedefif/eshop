'use client';

import { AlertTriangle } from 'lucide-react';

export default function MyOrdersError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white rounded-lg shadow border border-gray-200 p-6 text-center">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <h1 className="text-xl font-semibold text-gray-900">Nepodařilo se načíst moje objednávky</h1>
        <p className="text-sm text-gray-600 mt-2">
          Došlo k neočekávané chybě. Zkuste stránku načíst znovu.
        </p>
        <button
          onClick={reset}
          className="mt-5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Zkusit znovu
        </button>
      </div>
    </div>
  );
}
