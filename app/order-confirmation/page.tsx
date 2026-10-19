'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Loader2, Package, Truck, Building2, Mail, ChevronDown, Pencil, ArrowRight, ArrowLeft } from 'lucide-react';
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
        {error ? <div role="alert"><p>{error}</p><button onClick={() => setReload(n => n + 1)} className="mt-4 text-blue-700 underline">Zkusit znovu</button><Link href="/order-summary" className="ml-4 text-blue-700 underline">Zpět do košíku</Link></div> : <p role="status">Načítáme údaje objednávky…</p>}
    </CustomerPageShell>;

    const processing = orderStatus === 'processing';
    const completed = orderStatus === 'completed';
    const validCustomer = Boolean(orderData.customer.name && orderData.customer.email);
    const customer = orderData.customer;
    const canEdit = !completed && !processing && !orderData.attempted;
    const { petPackages, gasPieces } = checkoutAccessoryTotals(orderData.items, products);
    return (
        <CustomerPageShell width="5xl">
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-950">{completed ? 'Objednávka přijata' : 'Dokončení objednávky'}</h1>
            <p className="mb-6 text-sm leading-6 text-slate-600">{completed ? 'Objednávku jsme přijali. Její stav najdete v části Moje objednávky.' : 'Zkontrolujte souhrn a odešlete objednávku.'}</p>
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

            <section aria-label="Přehled a odeslání objednávky" aria-busy={processing} className="overflow-hidden rounded-2xl border border-slate-200 bg-white pb-24 shadow-sm sm:pb-0">
                <div className="bg-blue-50/60 px-5 pt-6 sm:px-8 sm:pt-7">
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-blue-800">Vaše objednávka</h2>
                        {!completed && <button onClick={() => void handleConfirmOrder()} disabled={processing || !ready || !validCustomer} className="hidden min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex">
                            {processing ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ArrowRight aria-hidden="true" className="h-4 w-4" />}{processing ? 'Odesíláme…' : orderData.attempted ? 'Ověřit / zopakovat odeslání' : 'Odeslat objednávku'}
                        </button>}
                    </div>
                    <dl className="grid grid-cols-2 gap-5 py-5 min-[400px]:grid-cols-[1.5fr_1fr_1fr] sm:gap-8 sm:py-6">
                        <div className="col-span-2 min-[400px]:col-span-1"><dt className="mb-2 text-sm font-medium text-slate-600">Celkový objem vín a nápojů</dt><dd className="flex items-baseline gap-2 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">{orderData.totalVolume}<span className="text-base font-medium tracking-normal text-slate-600 sm:text-lg">litrů</span></dd></div>
                        <div className="border-t border-blue-100 pt-4 min-[400px]:border-l min-[400px]:border-t-0 min-[400px]:pl-4 min-[400px]:pt-0 sm:pl-8"><dt className="mb-2 text-sm font-medium text-slate-600">Celkem balení PET</dt><dd className="text-2xl font-bold tabular-nums text-slate-800 sm:text-3xl">{petPackages}<span className="ml-2 text-sm font-medium text-slate-600">balení</span></dd></div>
                        <div className="border-t border-blue-100 pt-4 min-[400px]:border-l min-[400px]:border-t-0 min-[400px]:pl-4 min-[400px]:pt-0 sm:pl-8"><dt className="mb-2 text-sm font-medium text-slate-600">Celkem plynů</dt><dd className="text-2xl font-bold tabular-nums text-slate-800 sm:text-3xl">{gasPieces}<span className="ml-2 text-sm font-medium text-slate-600">ks</span></dd></div>
                    </dl>
                </div>
                    <details key={completed ? 'received' : 'review'} open={completed} className="group border-t border-slate-200/70">
                        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 sm:px-8 [&::-webkit-details-marker]:hidden">
                            <Package aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-700" /><span>{completed ? 'Zobrazit přijaté položky' : 'Zobrazit objednané položky'}</span><ChevronDown aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="border-t border-slate-100 px-5 sm:px-8">
                            <ul className="divide-y divide-slate-100">
                                {orderData.items.map(item => <li key={`${item.productId}-${item.volume}`} className="flex flex-col gap-2 py-4 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4"><span className="min-w-0 break-words font-medium leading-6 text-slate-800">{item.productName}</span><span className="shrink-0 self-start rounded-lg bg-slate-100 px-2.5 py-1 font-semibold tabular-nums text-slate-700">{item.display}</span></li>)}
                            </ul>
                            {canEdit && <Link href="/order-summary" className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Upravit položky v košíku</Link>}
                        </div>
                    </details>

                <div className="border-t border-slate-200 px-5 py-5 sm:px-8 sm:py-6">
                    <div className="grid gap-5 sm:grid-cols-2 sm:gap-10">
                        <section aria-labelledby="checkout-delivery" className="min-w-0">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3">
                                <h2 id="checkout-delivery" className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Truck aria-hidden="true" className="h-4 w-4 text-slate-400" />Doručení</h2>
                                {canEdit && <Link href="/my-profile?checkout=1" aria-label="Upravit dodací údaje" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-blue-700 hover:bg-blue-50"><Pencil aria-hidden="true" className="h-3.5 w-3.5" />Upravit</Link>}
                            </div>
                            <div className="text-sm leading-6 text-slate-600">
                                {customer.shippingCompany && <p className="break-words font-semibold text-slate-800">{customer.shippingCompany}</p>}
                                <p className="break-words">{customer.shippingAddress || 'Adresa není vyplněna'}</p>
                                <p>{[customer.shippingPostalCode, customer.shippingCity].filter(Boolean).join(' ')}</p>
                                <p>{customer.shippingCountry}</p>
                                <p className="mt-2 break-words">{customer.shippingContactName || customer.name}</p>
                                <p>{customer.phone || 'Telefon neuveden'}</p>
                            </div>
                        </section>
                        <section aria-labelledby="checkout-contact" className="min-w-0 sm:pt-3">
                            <h2 id="checkout-contact" className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><Mail aria-hidden="true" className="h-4 w-4 text-slate-400" />Potvrzení objednávky</h2>
                            <p className="break-all text-sm leading-6 text-slate-600">{customer.email}</p>
                            {customer.note && <div className="mt-4"><h3 className="mb-1 text-xs font-medium text-slate-500">Poznámka k objednávce</h3><p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{customer.note}</p></div>}
                        </section>
                    </div>
                    {customer.deliveryInstructions && <div className="mt-4"><h3 className="mb-1 text-xs font-medium text-slate-500">Pokyny k doručení</h3><p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{customer.deliveryInstructions}</p></div>}
                            <details className="group mt-4 border-t border-slate-100 pt-1">
                                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden"><Building2 aria-hidden="true" className="h-4 w-4" />Fakturační údaje<ChevronDown aria-hidden="true" className="ml-auto h-4 w-4 transition-transform group-open:rotate-180" /></summary>
                                <div className="pb-1 pt-2 text-sm leading-6 text-slate-700">
                                    {customer.company && <p className="break-words font-semibold">{customer.company}</p>}
                                    <p className="break-words">{customer.billingAddress || 'Adresa není vyplněna'}</p>
                                    <p>{[customer.billingPostalCode, customer.billingCity].filter(Boolean).join(' ')}</p>
                                    <p>{customer.billingCountry}</p>
                                    {customer.companyId && <p className="mt-2 text-xs text-slate-500">IČO: {customer.companyId}</p>}
                                    {customer.vatId && <p className="text-xs text-slate-500">DIČ: {customer.vatId}</p>}
                                    {canEdit && <Link href="/my-profile?checkout=1" className="mt-2 inline-flex min-h-11 items-center font-semibold text-blue-700 hover:underline">Upravit fakturační údaje</Link>}
                                </div>
                            </details>

                </div>
                {!completed ? <div id="checkout-submit" tabIndex={-1} className="scroll-mt-24 border-t border-slate-200 bg-slate-50/70 px-5 py-5 sm:px-8 sm:py-6">
                        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">{error}</div>}
                        {!ready && <button onClick={() => setReload(n => n + 1)} className="mb-4 min-h-11 text-sm font-semibold text-blue-700 underline">Znovu načíst údaje</button>}
                        {!validCustomer && <p className="mb-4 text-sm text-red-800">Před odesláním doplňte jméno a e-mail v profilu.</p>}
                        {orderData.attempted && !processing && <p className="mb-4 text-sm leading-6 text-slate-600">Nejprve ověřte výsledek původního pokusu opakováním nebo v historii. Obsah tohoto pokusu zůstává zachovaný.</p>}
                        <p role="status" aria-live="polite" className="mb-4 text-sm leading-6 text-slate-600">{processing ? 'Odesíláme objednávku. Vyčkejte prosím na výsledek, nejvýše 30 sekund.' : 'Odesláním předáte objednávku ke zpracování. Potvrzení vám zašleme e-mailem.'}</p>
                        {error && <Link href="/my-orders" className="mt-2 inline-flex min-h-11 w-full items-center justify-center text-sm font-semibold text-blue-700 underline">Ověřit v historii</Link>}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {!orderData.attempted && <button onClick={() => router.push('/order-summary')} disabled={processing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Zpět do košíku</button>}

                        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] sm:static sm:ml-auto sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
                        <button onClick={() => void handleConfirmOrder()} disabled={processing || !ready || !validCustomer} className="inline-flex min-h-12 w-full sm:w-auto sm:min-w-72 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                            {processing ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ArrowRight aria-hidden="true" className="h-4 w-4" />}{processing ? 'Odesíláme…' : orderData.attempted ? 'Ověřit / zopakovat odeslání' : 'Odeslat objednávku'}
                        </button>

                        </div>
                    </div>
                </div> : <div className="flex items-center gap-2 border-t border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800 sm:px-8"><CheckCircle aria-hidden="true" className="h-4 w-4" />Úspěšně odesláno</div>}
            </section>
        </CustomerPageShell>
    );
}
