'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { getAllowedVolumes } from '@/lib/product-config';

export default function ProductDetailPurchase({ id, path }: { id: string; path: string }) {
    const { user, isLoading } = useAuth();
    const cart = useCart();
    const params = useSearchParams();
    const [message, setMessage] = useState('');
    const product = cart.products.find(p => String(p.id) === id);
    const volumes = product ? getAllowedVolumes(product) : [];
    const loading = isLoading || !cart.isCartHydrated || cart.isProductsLoading;
    const available = !!product?.in_stock && !product.is_archived;
    const label = (v: string) => v === 'baleni' ? 'balení' : v === 'maly' ? 'malá láhev' : v === 'velky' ? 'velká láhev' : `${v} l`;
    const requestedReturn = params.get('navrat');
    const returnUrl = requestedReturn && (requestedReturn === '/' || requestedReturn.startsWith('/?')) ? requestedReturn : '/';
    const loginUrl = `/login?next=${encodeURIComponent(`${path}?navrat=${encodeURIComponent(returnUrl)}`)}`;

    return <section className="mt-4 border-t border-slate-200 pt-4" aria-label="Objednat produkt">
        <h2 className="text-lg font-bold text-slate-950">Balení a množství v košíku</h2>
        <p className="mt-1 text-sm text-slate-600">Kliknutím na balení přidáte kus, tlačítkem − jej odeberete.</p>
        {loading ? <p role="status" className="mt-3 text-slate-600">Načítáme aktuální nabídku a košík…</p> : cart.productsError ? <p role="alert" className="mt-3 text-red-700">Aktuální dostupnost se nepodařilo načíst. Obnovte stránku.</p> : <>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {volumes.map(v => {
                    const count = cart.cartItems[`${id}-${v}`] || 0;
                    return <div key={v} className={`overflow-hidden rounded-xl border ${count > 0 ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                        {user ? <button type="button" disabled={!available} aria-label={`Přidat ${label(v)} do košíku`} onClick={() => {
                            cart.addToCart(id, v); setMessage(`Přidáno balení ${label(v)}.`);
                        }} className="flex min-h-16 w-full items-center justify-between gap-2 px-4 py-3 text-left font-bold text-blue-950 hover:bg-blue-100 disabled:opacity-50">
                            {label(v)}<Plus aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-700" />
                        </button> : <Link href={loginUrl} className="flex min-h-16 items-center justify-between px-4 py-3 font-bold text-blue-950">{label(v)}<Plus aria-hidden="true" className="h-5 w-5" /></Link>}
                        <div className="flex items-center gap-2 border-t border-slate-200/70 px-2">
                            <button type="button" disabled={!user || count === 0} aria-label={`Odebrat ${label(v)} z košíku`} onClick={() => { cart.removeFromCart(id, v); setMessage(`Odebráno balení ${label(v)}.`); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-white disabled:opacity-30"><Minus aria-hidden="true" className="h-4 w-4" /></button>
                            <span className="text-xs font-semibold tabular-nums text-slate-700">{count} {v === 'baleni' ? 'balení' : 'ks'} v košíku</span>
                        </div>
                    </div>;
                })}
            </div>
            {!available && <p className="mt-2 text-sm text-slate-600">Produkt nyní není dostupný k objednání.</p>}
            {(product?.min_order_qty || 1) > 1 && <p className="mt-2 text-sm text-slate-600">Minimální odběr je {product?.min_order_qty} kusů; přidávání a odebírání respektuje toto minimum.</p>}
            {!user && <p className="mt-2 text-sm text-slate-600">Pro objednání se přihlaste kliknutím na balení.</p>}
        </>}
        <p role="status" aria-live="polite" className="sr-only">{message}</p>
        <nav aria-label="Pokračovat v nákupu" className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link href="/order-summary" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800"><ShoppingCart aria-hidden="true" className="h-4 w-4" />Zobrazit košík</Link>
            <Link href={returnUrl} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">Zpět do objednávkového katalogu</Link>
        </nav>
    </section>;
}
