'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Loader2, ClipboardCheck, Package, Truck, MapPin, Building2, UserRound, MessageSquareText, Pencil, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { draftKey, noteKey, parseDraft, type OrderDraft } from '@/lib/orders/draft';
import { checkoutAccessoryTotals } from '@/lib/orders/checkout-totals';
import { sameCustomer } from '@/lib/orders/customer';
import type { OrderStatus, OrderCustomer } from '@/types/orders';
import CustomerPageShell from '@/components/CustomerPageShell';
import CheckoutSteps from '@/components/CheckoutSteps';
import { useCart } from '@/contexts/CartContext';
import { ANALYTICS_EVENTS, completeAnalyticsJourney, trackAnalyticsEvent } from '@/lib/analytics/client';

export default function OrderConfirmationPage() {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const { clearOrderedItems, products } = useCart();
    const [orderStatus, setOrderStatus] = useState<OrderStatus>('pending');
    const [orderData, setOrderData] = useState<OrderDraft | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [ready, setReady] = useState(false);
    const [reload, setReload] = useState(0);
    const submitting = useRef(false);
    const owner = useRef(user?.id);
    owner.current = user?.id;

    useEffect(() => {
        if (isLoading) return;
        if (!user) { setOrderData(null); router.replace('/login'); return; }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        let active = true;
        setReady(false);
        setError('');
        const load = async () => {
            try {
                const draft = parseDraft(sessionStorage.getItem(draftKey(user.id)), user.id);
                if (!draft) { router.replace('/order-summary'); return; }
                setOrderData(draft);
                if (draft.completedOrderId) { setOrderStatus('completed'); setReady(true); return; }
                setOrderStatus('pending');
                const response = await fetch('/api/checkout', { cache: 'no-store', signal: controller.signal });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Údaje se nepodařilo načíst.');
                if (result.userId !== user.id) throw new Error('Účet se změnil. Přihlaste se znovu.');
                if (!active) return;
                const customer: OrderCustomer = { ...result.customer, note: draft.customer.note || '' };
                if (!sameCustomer(draft.customer, customer)) setNotice('Údaje jsme obnovili podle aktuálního profilu. Před odesláním je prosím zkontrolujte.');
                const updated = { ...draft, customer };
                sessionStorage.setItem(draftKey(user.id), JSON.stringify(updated));
                setOrderData(updated);
                setReady(true);
            } catch (e) {
                if (active) setError(e instanceof Error && e.name !== 'AbortError' && !(e instanceof TypeError) ? e.message : 'Načítání trvá příliš dlouho. Zkontrolujte připojení a zkuste to znovu.');
            } finally { clearTimeout(timer); }
        };
        void load();
        return () => { active = false; clearTimeout(timer); controller.abort(); };
    }, [user, isLoading, router, reload]);

    useEffect(() => {
        if (orderStatus !== 'processing') return;
        const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
        // Includes the shared header: an in-flight order must not be edited via navigation.
        const preventNavigation = (event: MouseEvent) => {
            if (event.target instanceof Element && event.target.closest('a')) event.preventDefault();
        };
        window.addEventListener('beforeunload', beforeUnload);
        document.addEventListener('click', preventNavigation, true);
        return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', preventNavigation, true); };
    }, [orderStatus]);

    const handleConfirmOrder = async () => {
        if (!user || !orderData || orderData.userId !== user.id || !ready || submitting.current || orderData.completedOrderId) return;
        submitting.current = true;
        setError('');
        setOrderStatus('processing');
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);
        let attempted = orderData;
        let orderId: string;
        let savedCustomer: OrderCustomer | undefined;
        try {
            attempted = { ...orderData, attempted: true };
            // Persist before sending so refresh/retry always uses the same key.
            sessionStorage.setItem(draftKey(user.id), JSON.stringify(attempted));
            setOrderData(attempted);
            const response = await fetch('/api/checkout', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
                body: JSON.stringify({ userId: user.id, requestKey: attempted.requestKey, items: attempted.items, note: attempted.customer.note || '', expectedCustomer: attempted.customer }),
            });
            const result = await response.json();
            if (owner.current !== user.id) return;
            if (!response.ok) {
                if (result.code === 'CUSTOMER_CHANGED') {
                    const updated = { ...attempted, attempted: false, customer: { ...result.customer, note: attempted.customer.note } };
                    sessionStorage.setItem(draftKey(user.id), JSON.stringify(updated));
                    setOrderData(updated);
                } else if (response.status === 400) {
                    const rejected = { ...attempted, attempted: false };
                    sessionStorage.setItem(draftKey(user.id), JSON.stringify(rejected));
                    setOrderData(rejected);
                }
                throw new Error(result.error || 'Odeslání se nepodařilo ověřit. Opakujte stejný pokus nebo zkontrolujte historii objednávek.');
            }
            if (typeof result.orderId !== 'string' || !result.orderId) throw new Error('Server nevrátil číslo objednávky. Opakujte stejný pokus pro ověření výsledku.');
            orderId = result.orderId;
            savedCustomer = result.customer;
        } catch (e) {
            if (owner.current === user.id) {
                setOrderStatus('error');
                setError(e instanceof Error && e.name !== 'AbortError' && !(e instanceof TypeError) ? e.message : 'Odpověď serveru nepřišla včas. Objednávka již mohla být přijata. Opakujte stejný pokus pro ověření; nevznikne druhá objednávka.');
            }
            return;
        } finally { clearTimeout(timer); submitting.current = false; }

        // Once the server confirms the order, cleanup must never turn success into failure.
        const completed = { ...attempted, customer: savedCustomer || attempted.customer, completedOrderId: orderId };
        setOrderData(completed);
        setOrderStatus('completed');
        setNotice('');
        try {
            sessionStorage.setItem(draftKey(user.id), JSON.stringify(completed));
            sessionStorage.removeItem(noteKey(user.id));
        } catch { /* Retained request key still protects retries. */ }
        try { clearOrderedItems(attempted.items); } catch { setNotice('Objednávka je přijata. Košík se nepodařilo vyčistit; další objednávku ověřte v historii.'); }
        try {
            completeAnalyticsJourney();
            void trackAnalyticsEvent(ANALYTICS_EVENTS.orderSubmitted, { itemCount: attempted.items.reduce((sum, item) => sum + item.quantity, 0), oncePerJourney: true }).catch(() => {});
        } catch { /* Telemetry cannot affect the receipt. */ }
    };

    if (!orderData || !user || orderData.userId !== user.id) return <CustomerPageShell width="5xl">
        <h1 className="mb-6 text-3xl font-bold text-slate-950">Kontrola a odeslání</h1>
        {error ? <div role="alert"><p>{error}</p><button onClick={() => setReload(n => n + 1)} className="mt-4 text-blue-700 underline">Zkusit znovu</button><Link href="/order-summary" className="ml-4 text-blue-700 underline">Zpět k souhrnu</Link></div> : <p role="status">Načítáme údaje objednávky…</p>}
    </CustomerPageShell>;

    const processing = orderStatus === 'processing';
    const completed = orderStatus === 'completed';
    const validCustomer = Boolean(orderData.customer.name && orderData.customer.email);
    const customer = orderData.customer;
    const canEdit = !completed && !processing && !orderData.attempted;
    const { petPackages, gasPieces } = checkoutAccessoryTotals(orderData.items, products);
    return (
        <CustomerPageShell width="5xl">
            <header className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 to-slate-800 p-6 text-white shadow-sm sm:p-8">
                <div className="flex items-start justify-between gap-5">
                    <div>
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-blue-200">{completed ? 'Děkujeme za vaši objednávku' : 'Poslední krok před odesláním'}</p>
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{completed ? 'Objednávka přijata' : 'Kontrola a odeslání'}</h1>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">{completed ? 'Všechny údaje máte přehledně na jednom místě. Stav objednávky najdete v historii.' : 'Zkontrolujte vybrané produkty a údaje pro doručení. Pak už stačí objednávku odeslat.'}</p>
                    </div>
                    <div className="hidden shrink-0 rounded-2xl border border-white/10 bg-white/5 p-4 sm:block">
                        {completed ? <CheckCircle aria-hidden="true" className="h-7 w-7 text-emerald-300" /> : <ClipboardCheck aria-hidden="true" className="h-7 w-7 text-blue-300" />}
                    </div>
                </div>
            </header>
            <CheckoutSteps current={completed ? 3 : 2} onSummary={!completed && !processing && !orderData.attempted ? () => router.push('/order-summary') : undefined} />
            {notice && <p role="status" className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">{notice}</p>}
            {completed && (
                <section role="status" className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                        <CheckCircle aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
                        <div>
                            <h2 className="text-lg font-bold text-emerald-950">Děkujeme, objednávku jsme přijali.</h2>
                            <p className="mt-1 text-sm leading-6 text-emerald-900">Potvrzení vám zašleme e-mailem. Objednávka je uložená pod číslem <strong>#{orderData.completedOrderId?.substring(0, 8)}</strong>.</p>
                        </div>
                    </div>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800" href={`/my-orders#order-${orderData.completedOrderId}`}>Zobrazit objednávku<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
                        <Link className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-100" href="/">Zpět do katalogu</Link>
                    </div>
                </section>
            )}

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]" aria-busy={processing}>
                <div className="min-w-0 space-y-5">
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="checkout-items">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                            <h2 id="checkout-items" className="flex items-center gap-3 text-base font-bold text-slate-950"><Package aria-hidden="true" className="h-5 w-5 text-blue-700" />Položky objednávky</h2>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-600">{orderData.items.length}</span>
                        </div>
                        <ul className="divide-y divide-slate-100 px-5 sm:px-6">
                            {orderData.items.map((item) => (
                                <li key={`${item.productId}-${item.volume}`} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                    <span className="min-w-0 break-words text-sm font-medium leading-6 text-slate-800">{item.productName}</span>
                                    <span className="self-start whitespace-nowrap rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-sm font-semibold tabular-nums text-blue-800">{item.display}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="checkout-delivery">
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-slate-100 px-5 py-4 sm:px-6">
                            <h2 id="checkout-delivery" className="flex items-center gap-3 text-base font-bold text-slate-950"><Truck aria-hidden="true" className="h-5 w-5 text-blue-700" />Doručení a fakturace</h2>
                            {canEdit && <Link href="/my-profile?checkout=1" aria-label="Upravit kontaktní a dodací údaje" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-900"><Pencil aria-hidden="true" className="h-3.5 w-3.5" />Upravit údaje</Link>}
                        </div>
                        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                            <div className="min-w-0 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm leading-6 text-slate-700">
                                <h3 className="mb-2 flex items-center gap-2 font-bold text-blue-950"><MapPin aria-hidden="true" className="h-4 w-4 text-blue-700" />Dodací adresa</h3>
                                {customer.shippingCompany && <p className="break-words font-semibold text-slate-900">{customer.shippingCompany}</p>}
                                {customer.shippingContactName && <p className="break-words">{customer.shippingContactName}</p>}
                                <p className="break-words">{customer.shippingAddress || 'Adresa není vyplněna'}</p>
                                <p>{[customer.shippingPostalCode, customer.shippingCity].filter(Boolean).join(' ')}</p>
                                <p className="text-slate-500">{customer.shippingCountry}</p>
                            </div>
                            <div className="min-w-0 p-1 text-sm leading-6 text-slate-700 sm:p-4">
                                <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-950"><Building2 aria-hidden="true" className="h-4 w-4 text-slate-400" />Fakturační adresa</h3>
                                {customer.company && <p className="break-words font-semibold text-slate-900">{customer.company}</p>}
                                <p className="break-words">{customer.billingAddress || 'Adresa není vyplněna'}</p>
                                <p>{[customer.billingPostalCode, customer.billingCity].filter(Boolean).join(' ')}</p>
                                <p className="text-slate-500">{customer.billingCountry}</p>
                                {(customer.companyId || customer.vatId) && <div className="mt-2 text-xs text-slate-500">{customer.companyId && <p>IČO: {customer.companyId}</p>}{customer.vatId && <p>DIČ: {customer.vatId}</p>}</div>}
                            </div>
                        </div>
                        {customer.deliveryInstructions && <div className="mx-5 mb-5 border-t border-slate-100 pt-4 sm:mx-6 sm:mb-6"><h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Pokyny k doručení</h3><p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{customer.deliveryInstructions}</p></div>}
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="checkout-contact">
                        <h2 id="checkout-contact" className="mb-4 flex items-center gap-3 text-base font-bold text-slate-950"><UserRound aria-hidden="true" className="h-5 w-5 text-blue-700" />Kontaktní údaje</h2>
                        <dl className="grid gap-4 text-sm sm:grid-cols-2">
                            <div><dt className="mb-1 text-xs font-medium text-slate-500">Kontaktní osoba</dt><dd className="break-words font-semibold text-slate-800">{customer.name}</dd></div>
                            <div><dt className="mb-1 text-xs font-medium text-slate-500">Telefon</dt><dd className="font-medium text-slate-800">{customer.phone || 'Neuveden'}</dd></div>
                            <div className="sm:col-span-2"><dt className="mb-1 text-xs font-medium text-slate-500">E-mail pro potvrzení objednávky</dt><dd className="break-all font-medium text-slate-800">{customer.email}</dd></div>
                        </dl>
                    </section>
                    {customer.note && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="mb-3 flex items-center gap-3 text-base font-bold text-slate-950"><MessageSquareText aria-hidden="true" className="h-5 w-5 text-blue-700" />Poznámka k objednávce</h2><p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{customer.note}</p></section>}
                </div>

                <aside aria-label="Přehled a odeslání objednávky" className="overflow-hidden rounded-2xl border-2 border-blue-300 bg-white shadow-lg shadow-blue-950/10 lg:sticky lg:top-24">
                    <div className="border-b border-blue-100 bg-gradient-to-b from-blue-50 to-white p-5 sm:p-6">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-950">{completed ? 'Přijatá objednávka' : 'Vaše objednávka'}</h2>
                        {!completed && <p className="mt-2 text-sm font-medium text-blue-800">Přehled a odeslání objednávky</p>}
                        <div className="mt-4"><p className="text-sm text-slate-500">Celkový objem vín a nápojů</p><p className="mt-2 text-4xl font-bold tracking-tight text-slate-950">{orderData.totalVolume}<span className="ml-2 text-xl font-medium text-slate-500">litrů</span></p></div>
                        <dl className="mt-5 space-y-3 text-sm">
                            <div className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${petPackages === 0 ? 'border-amber-200 bg-amber-50' : 'border-blue-100 bg-blue-50/60'}`}>
                                <dt className="font-medium text-slate-700">Celkem balení PET</dt>
                                <dd className={`shrink-0 font-bold tabular-nums ${petPackages === 0 ? 'text-amber-900' : 'text-blue-900'}`}>{petPackages} balení</dd>
                            </div>
                            <div className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${gasPieces === 0 ? 'border-amber-200 bg-amber-50' : 'border-blue-100 bg-blue-50/60'}`}>
                                <dt className="font-medium text-slate-700">Celkem plynů</dt>
                                <dd className={`shrink-0 font-bold tabular-nums ${gasPieces === 0 ? 'text-amber-900' : 'text-blue-900'}`}>{gasPieces} ks</dd>
                            </div>
                        </dl>
                    </div>
                    {!completed ? <div className="p-5 sm:p-6">
                        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">{error}</div>}
                        {!ready && <button onClick={() => setReload(n => n + 1)} className="mb-4 min-h-11 text-sm font-semibold text-blue-700 underline">Znovu načíst údaje</button>}
                        {!validCustomer && <p className="mb-4 text-sm text-red-800">Před odesláním doplňte jméno a e-mail v profilu.</p>}
                        {orderData.attempted && !processing && <p className="mb-4 text-sm leading-6 text-slate-600">Nejprve ověřte výsledek původního pokusu opakováním nebo v historii. Obsah tohoto pokusu zůstává zachovaný.</p>}
                        <p role="status" aria-live="polite" className="mb-4 text-sm leading-6 text-slate-600">{processing ? 'Odesíláme objednávku. Vyčkejte prosím na výsledek, nejvýše 30 sekund.' : 'Je vše v pořádku? Odesláním předáte objednávku ke zpracování.'}</p>
                        <button onClick={() => void handleConfirmOrder()} disabled={processing || !ready || !validCustomer} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                            {processing ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ArrowRight aria-hidden="true" className="h-4 w-4" />}{processing ? 'Odesíláme…' : orderData.attempted ? 'Ověřit / zopakovat odeslání' : 'Odeslat objednávku'}
                        </button>
                        {!orderData.attempted && <button onClick={() => router.push('/order-summary')} disabled={processing} className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Upravit souhrn</button>}
                        {error && <Link href="/my-orders" className="mt-2 inline-flex min-h-11 w-full items-center justify-center text-sm font-semibold text-blue-700 underline">Ověřit v historii</Link>}
                    </div> : <div className="flex items-center gap-2 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800"><CheckCircle aria-hidden="true" className="h-4 w-4" />Úspěšně odesláno</div>}
                </aside>
            </div>
        </CustomerPageShell>
    );
}
