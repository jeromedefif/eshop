'use client';

import { useState } from 'react';
import { BookmarkPlus, Trash2 } from 'lucide-react';
import { usePurchasing } from '@/contexts/PurchasingContext';
import type { CartItems } from '@/contexts/CartContext';

export default function CartTools({ cartItems, canSave, onClear }: { cartItems: CartItems; canSave: boolean; onClear: () => void }) {
    const { createTemplate } = usePurchasing();
    const [saving, setSaving] = useState(false);
    const [saveOpen, setSaveOpen] = useState(false);
    const [clearOpen, setClearOpen] = useState(false);
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const save = async () => {
        if (!canSave || !name.trim() || saving) return;
        setSaving(true); setError(''); setSaved(false);
        try { await createTemplate(name.trim(), cartItems); setSaveOpen(false); setName(''); setSaved(true); }
        catch (error) { setError(error instanceof Error ? error.message : 'Šablonu se nepodařilo uložit.'); }
        finally { setSaving(false); }
    };
    return <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
            {canSave && <button type="button" aria-expanded={saveOpen} aria-controls="cart-save-template" onClick={() => { setSaveOpen(value => !value); setClearOpen(false); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"><BookmarkPlus size={17} aria-hidden="true" />Uložit jako šablonu</button>}
            <button type="button" aria-expanded={clearOpen} aria-controls="cart-clear-confirm" onClick={() => { setClearOpen(value => !value); setSaveOpen(false); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"><Trash2 size={17} aria-hidden="true" />Vyprázdnit košík</button>
        </div>
        {saveOpen && <div id="cart-save-template" className="mt-4 border-t border-slate-100 pt-4">
            <label htmlFor="cart-template-name" className="block text-sm font-semibold text-slate-800">Název šablony</label>
            <input id="cart-template-name" maxLength={80} value={name} onChange={e => setName(e.target.value)} disabled={saving} placeholder="Např. Pravidelný závoz" className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base text-slate-900 sm:max-w-md" />
            <div className="mt-3 flex gap-2"><button type="button" onClick={() => void save()} disabled={!name.trim() || saving} className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Ukládáme…' : 'Uložit šablonu'}</button><button type="button" disabled={saving} onClick={() => setSaveOpen(false)} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">Zrušit</button></div>
            {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        </div>}
        {clearOpen && <div id="cart-clear-confirm" className="mt-4 border-t border-slate-100 pt-4"><p className="text-sm text-slate-700">Opravdu chcete odstranit všechny položky z košíku?</p><div className="mt-3 flex gap-2"><button type="button" onClick={onClear} className="min-h-11 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white">Ano, vyprázdnit košík</button><button type="button" onClick={() => setClearOpen(false)} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">Ponechat položky</button></div></div>}
        {saved && <p role="status" className="mt-2 text-sm text-emerald-800">Šablona je uložená. Najdete ji v části Moje objednávky.</p>}
    </div>;
}
