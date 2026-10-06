'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, ArrowRight, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { getAllowedVolumes } from '@/lib/product-config';

export default function ProductDetailPurchase({ id, path }: { id: string; path: string }) {
    const { user, isLoading } = useAuth();
    const cart = useCart();
    const params = useSearchParams();
    const [volume, setVolume] = useState(params.get('baleni') || '');
    const [quantity, setQuantity] = useState(params.get('pocet') || '1');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const product = cart?.products.find(p => String(p.id) === id);
    const volumes = product ? getAllowedVolumes(product) : [];
    const selected = volume || volumes[0] || '';
    const count = Number(quantity);
    const minimum = product?.min_order_qty || 1;
    const validCount = Number.isInteger(count) && count >= minimum && count <= 999;
    const available = !!product?.in_stock && !product.is_archived && volumes.includes(selected);
    const loading = isLoading || !cart?.isCartHydrated || cart.isProductsLoading;
    const label = (v: string) => v === 'baleni' ? 'balení' : v === 'maly' ? 'malá láhev' : v === 'velky' ? 'velká láhev' : `${v} l`;
    const returnPath = `${path}?baleni=${encodeURIComponent(selected)}&pocet=${encodeURIComponent(quantity)}`;
    const loginUrl = `/login?next=${encodeURIComponent(returnPath)}`;

    function add() {
        setError(''); setMessage('');
        if (!user || !cart || loading || !available || !validCount || cart.productsError) return;
        const already = cart.cartItems[`${id}-${selected}`] || 0;
        // The existing cart adds the product minimum on the first increment.
        const increments = already ? count : count - minimum + 1;
        for (let i = 0; i < increments; i++) cart.addToCart(id, selected);
        setMessage(`Přidáno ${count}× ${label(selected)} do košíku.`);
    }

    return <section className="mt-8 border-t border-slate-200 pt-6" aria-label="Objednat produkt">
        <h2 className="text-xl font-bold text-slate-950">Vyberte balení a množství</h2>
        {loading ? <p role="status" className="mt-3 text-slate-600">Načítáme aktuální nabídku a košík…</p> : cart?.productsError ? <p role="alert" className="mt-3 text-red-700">Aktuální dostupnost se nepodařilo načíst. Obnovte stránku.</p> : <>
            <fieldset className="mt-4">
                <legend className="mb-3 text-sm text-slate-600">Vyberte balení; počty ukazují aktuální obsah košíku.</legend>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {volumes.map(v => {
                        const inCart = cart.cartItems[`${id}-${v}`] || 0;
                        return <button key={v} type="button" aria-pressed={selected === v} disabled={!product?.in_stock || product.is_archived} onClick={() => { setVolume(v); setMessage(''); }}
                            className={`relative flex min-h-20 flex-col items-start justify-center gap-1 rounded-xl border px-4 py-3 text-left transition disabled:opacity-50 ${selected === v ? 'border-blue-700 ring-2 ring-blue-700 ring-offset-2' : 'border-slate-200 hover:border-blue-300'} ${inCart > 0 ? 'bg-blue-50 text-blue-950' : 'bg-white text-slate-800'}`}>
                            <span className="text-base font-bold">{label(v)}</span>
                            <span className={`text-xs ${inCart > 0 ? 'font-semibold text-blue-800' : 'text-slate-500'}`}>{inCart > 0 ? `V košíku ${inCart} ${v === 'baleni' ? 'balení' : 'ks'}` : 'Zatím není v košíku'}</span>
                        </button>;
                    })}
                </div>
            </fieldset>
            {!available && <p className="mt-3 text-slate-600">Toto balení nyní není dostupné k objednání.</p>}
            <label className="mt-5 block text-sm font-semibold" htmlFor="detail-quantity">Kolik kusů / balení přidat</label>
            <input id="detail-quantity" type="number" inputMode="numeric" min={minimum} max={999} step={1} value={quantity} onChange={e => setQuantity(e.target.value)} className="mt-2 min-h-12 w-28 rounded-xl border border-slate-300 px-3 text-base" />
            {!validCount && <p className="mt-2 text-sm text-amber-800">Zadejte celé číslo od {minimum} do 999.</p>}
            {user ? <button type="button" disabled={!available || !validCount} onClick={add} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-50"><ShoppingCart className="h-5 w-5" />Přidat do košíku</button> : <Link href={loginUrl} className="mt-4 flex min-h-12 items-center justify-center rounded-xl bg-blue-700 p-3 font-bold text-white">Přihlásit se a pokračovat</Link>}
        </>}
        <div role="status" aria-live="polite" className="mt-3 min-h-6 text-sm font-medium text-emerald-800">
            {message && <span className="inline-flex items-center gap-2"><Check aria-hidden="true" className="h-4 w-4 shrink-0" />{message}</span>}
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <nav aria-label="Pokračovat v nákupu" className="mt-5 grid gap-3 border-t border-slate-200 pt-5">
            <Link href="/order-summary" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"><ShoppingCart aria-hidden="true" className="h-4 w-4" />Zobrazit košík<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
            <Link href={`/?produkt=${id}`} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">Zpět do objednávkového katalogu</Link>
        </nav>
    </section>;
}
