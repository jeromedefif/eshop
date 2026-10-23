'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
const storageKey = 'beginy-header-preview-v1';
const changeEvent = 'beginy-header-preview-change';
function subscribe(callback: () => void) {
    window.addEventListener('storage', callback);
    window.addEventListener(changeEvent, callback);
    return () => { window.removeEventListener('storage', callback); window.removeEventListener(changeEvent, callback); };
}
function readVariant() {
    try { return window.localStorage.getItem(storageKey) === 'legacy' ? 'legacy' : 'modern'; }
    catch { return 'modern'; }
}
const serverVariant = () => 'modern';

export default function HeaderVariant({ legacy, modern }: { legacy: ReactNode; modern: ReactNode }) {
    const variant = useSyncExternalStore(subscribe, readVariant, serverVariant);
    const isLocalPreview = process.env.NODE_ENV === 'development';
    // Approved default; a production rebuild with legacy restores the original header.
    const useModern = isLocalPreview ? variant === 'modern' : process.env.NEXT_PUBLIC_CUSTOMER_HEADER !== 'legacy';
    return <>
        {useModern ? modern : legacy}
        {isLocalPreview && <button type="button" onClick={() => {
            try { window.localStorage.setItem(storageKey, useModern ? 'legacy' : 'modern'); }
            catch { return; }
            window.dispatchEvent(new Event(changeEvent));
        }} className="fixed bottom-24 right-3 z-40 sm:bottom-3 rounded-lg border border-slate-300 bg-white/95 px-3 py-2 text-[11px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50" title="Pouze místní náhled. Přepnutí nemění košík ani účet.">
            Lokální náhled · {useModern ? 'Původní hlavička' : 'Nová hlavička'}
        </button>}
    </>;
}
