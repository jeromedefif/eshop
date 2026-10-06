'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, Minus, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { getAllowedVolumes, normalizeProductCategory } from '@/lib/product-config';

export default function ProductDetailPurchase({ id, path }: { id: string; path: string }) {
    const { user, isLoading } = useAuth();
    const cart = useCart();
    const params = useSearchParams();
    const [message, setMessage] = useState('');
    const product = cart.products.find(p => String(p.id) === id);
    const volumes = product ? getAllowedVolumes(product) : [];
    const loading = isLoading || !cart.isCartHydrated || cart.isProductsLoading;
    const available = !!product?.in_stock && !product.is_archived;
    const category = normalizeProductCategory(product?.category || '');
    const baseLabel = (v: string) => v === 'baleni' ? 'balení' : v === 'maly' ? 'malá láhev' : v === 'velky' ? 'velká láhev' : `${v} l`;
    const packaging = (v: string) => {
        if (category === 'PET' && v === 'baleni') {
            const pieces = product?.name.match(/(?:^|[^0-9])(\d+)\s*ks\b/i)?.[1];
            return pieces ? `${pieces} ks` : '';
        }
        if (category === 'Burčák') {
            if (v === '50') return '2 × 25 l barel';
            return ['20', '25'].includes(v) ? 'barel' : '';
        }
        if (!['Víno', 'Perlivé', 'Ovocné víno', 'Nápoje'].includes(category)) return '';
        if (v === '20' && category === 'Perlivé') return 'PKEG';
        if (['3', '5', '10', '20'].includes(v)) return 'BIB';
        return ['30', '50'].includes(v) ? 'KEG' : '';
    };
    const label = (v: string) => [baseLabel(v), packaging(v)].filter(Boolean).join(' ');
    const volumeLabel = (v: string) => <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span>{baseLabel(v)}</span>
        {packaging(v) && <span className="text-xs font-medium text-slate-600">{packaging(v)}</span>}
    </span>;
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
                    return <div key={v} className={`overflow-hidden rounded-xl border transition-colors ${count > 0 ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white'}`}>
                        {user ? <button type="button" disabled={!available} aria-label={`Přidat ${label(v)} do košíku`} onClick={() => {
                            cart.addToCart(id, v); setMessage(`Přidáno balení ${label(v)}.`);
                        }} className="flex min-h-16 w-full items-center justify-between gap-2 px-4 py-3 text-left font-bold text-blue-950 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
                            {volumeLabel(v)}<Plus aria-hidden="true" className="h-8 w-8 shrink-0 rounded-lg bg-blue-100 p-1.5 text-blue-700" />
                        </button> : <Link href={loginUrl} className="flex min-h-16 items-center justify-between gap-2 px-4 py-3 font-bold text-blue-950">{volumeLabel(v)}<Plus aria-hidden="true" className="h-5 w-5" /></Link>}
                        <div className="flex items-center gap-3 border-t border-slate-200/70 px-2 py-2">
                            <button type="button" disabled={!user || count === 0} aria-label={`Odebrat ${label(v)} z košíku`} onClick={() => { cart.removeFromCart(id, v); setMessage(`Odebráno balení ${label(v)}.`); }} title="Odebrat balení" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition-colors hover:border-red-300 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"><Minus aria-hidden="true" className="h-5 w-5" strokeWidth={2.5} /></button>
                            <span className="flex min-w-0 flex-col"><span className={`text-lg font-bold leading-tight tabular-nums ${count > 0 ? 'text-blue-950' : 'text-slate-500'}`}>{count} <span className="text-xs font-medium">{v === 'baleni' ? 'balení' : 'ks'}</span></span><span className="text-xs text-slate-500">{count > 0 ? 'V košíku' : 'Zatím nevybráno'}</span></span>
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
            <Link href="/order-summary" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"><ShoppingCart aria-hidden="true" className="h-4 w-4" />Zobrazit košík</Link>
            <Link href={returnUrl} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"><ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />Zpět do objednávkového katalogu</Link>
        </nav>
    </section>;
}
