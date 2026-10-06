'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchasing } from '@/contexts/PurchasingContext';

export default function ProductDetailFavorite({ id }: { id: string }) {
    const { user } = useAuth();
    const { favoriteProductIds, toggleFavorite, isLoading } = usePurchasing();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    if (!user) return null;
    const favorite = favoriteProductIds.has(id);
    return <div className="mt-4">
        <button type="button" disabled={busy || isLoading} aria-pressed={favorite} onClick={async () => {
            setBusy(true); setError('');
            try { await toggleFavorite(id); } catch { setError('Oblíbené se nepodařilo uložit. Zkuste to znovu.'); } finally { setBusy(false); }
        }} className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${favorite ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <Heart aria-hidden="true" className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />{favorite ? 'V oblíbených' : 'Přidat do oblíbených'}
        </button>
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>;
}
