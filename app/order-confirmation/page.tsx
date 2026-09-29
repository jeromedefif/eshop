'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { draftKey, noteKey, parseDraft, type OrderDraft } from '@/lib/orders/draft';
import { sameCustomer } from '@/lib/orders/customer';
import type { OrderStatus, OrderCustomer } from '@/types/orders';
import CustomerPageShell from '@/components/CustomerPageShell';
import CheckoutSteps from '@/components/CheckoutSteps';
import { useCart } from '@/contexts/CartContext';
import { ANALYTICS_EVENTS, completeAnalyticsJourney, trackAnalyticsEvent } from '@/lib/analytics/client';

export default function OrderConfirmationPage() {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const { clearOrderedItems } = useCart();
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
    return (
        <CustomerPageShell width="5xl">
            <h1 className="mb-6 text-3xl font-bold tracking-tight text-slate-950">{completed ? 'Objednávka přijata' : 'Kontrola a odeslání'}</h1>
            <CheckoutSteps current={completed ? 3 : 2} />
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" aria-busy={processing}>
                {completed && <div role="status" className="mb-6 rounded-xl bg-green-50 p-5 text-green-900">
                    <CheckCircle className="mb-2 h-8 w-8" />
                    <h2 className="text-xl font-bold">Děkujeme, objednávku jsme přijali.</h2>
                    <p className="mt-2 break-all">Číslo objednávky: <strong>#{orderData.completedOrderId?.substring(0, 8)}</strong></p>
                    <p className="mt-2">Potvrzení vám zašleme e-mailem. Stav objednávky můžete sledovat v historii.</p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <Link className="rounded-lg bg-blue-700 px-4 py-3 text-center font-semibold text-white" href={`/my-orders#order-${orderData.completedOrderId}`}>Zobrazit objednávku</Link>
                        <Link className="rounded-lg border border-green-300 px-4 py-3 text-center font-semibold" href="/">Zpět do katalogu</Link>
                    </div>
                </div>}
                {notice && <p role="status" className="mb-6 rounded-lg bg-blue-50 p-4 text-blue-900">{notice}</p>}
                {!completed && <p className="mb-6 text-slate-600">Zkontrolujte položky a adresu doručení. Objednávku odešlete tlačítkem dole.</p>}
                {/* Objednané položky */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Položky objednávky</h3>
                    <div className="space-y-2 mb-4">
                        {orderData.items.map((item, index) => (
                            <div key={index} className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4 text-gray-700">
                                <span>{item.productName}</span>
                                <span className="shrink-0 font-medium">{item.display}</span>
                            </div>
                        ))}
                    </div>
                    {orderData.totalVolume > 0 && (
                        <div className="border-t pt-2 font-semibold text-gray-900">
                            Celkový objem nápojů: {orderData.totalVolume}L
                        </div>
                    )}
                </div>

                {!completed && !processing && !orderData.attempted && <Link href="/my-profile?checkout=1" className="mb-4 inline-flex min-h-11 items-center font-semibold text-blue-700 underline">Upravit kontaktní a dodací údaje</Link>}
                {/* Kontaktní údaje */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Kontaktní údaje</h3>
                    <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 text-gray-700">
                            <span className="font-medium">Jméno:</span>
                            <span>{orderData.customer.name}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 text-gray-700">
                            <span className="font-medium">Email:</span>
                            <span>{orderData.customer.email}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 text-gray-700">
                            <span className="font-medium">Telefon:</span>
                            <span>{orderData.customer.phone}</span>
                        </div>
                        {orderData.customer.company && (
                            <div className="grid grid-cols-1 md:grid-cols-2 text-gray-700">
                                <span className="font-medium">Firma:</span>
                                <span>{orderData.customer.company}</span>
                            </div>
                        )}
                        {orderData.customer.companyId && (
                            <div className="grid grid-cols-1 md:grid-cols-2 text-gray-700">
                                <span className="font-medium">IČO:</span>
                                <span>{orderData.customer.companyId}</span>
                            </div>
                        )}
                        {orderData.customer.vatId && (
                            <div className="grid grid-cols-1 md:grid-cols-2 text-gray-700">
                                <span className="font-medium">DIČ:</span>
                                <span>{orderData.customer.vatId}</span>
                            </div>
                        )}
                        {orderData.customer.note && (
                            <div className="grid grid-cols-1 md:grid-cols-2 text-gray-700">
                                <span className="font-medium">Poznámka:</span>
                                <span className="whitespace-pre-wrap break-words">{orderData.customer.note}</span>
                            </div>
                        )}
                    </div>
                </div>

                {(orderData.customer.billingAddress || orderData.customer.shippingAddress) && (
                    <div className="mb-6 grid gap-3 md:grid-cols-2">
                        {orderData.customer.billingAddress && (
                            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
                                <h3 className="mb-2 font-semibold text-gray-900">Fakturační adresa</h3>
                                <p>{orderData.customer.billingAddress}</p>
                                <p>{[orderData.customer.billingPostalCode, orderData.customer.billingCity].filter(Boolean).join(' ')}</p>
                                <p>{orderData.customer.billingCountry}</p>
                            </div>
                        )}
                        {orderData.customer.shippingAddress && (
                            <div className="rounded-lg bg-blue-50 p-4 text-sm text-gray-700">
                                <h3 className="mb-2 font-semibold text-gray-900">Dodací adresa</h3>
                                {orderData.customer.shippingCompany && <p className="font-medium">{orderData.customer.shippingCompany}</p>}
                                {orderData.customer.shippingContactName && <p>{orderData.customer.shippingContactName}</p>}
                                <p>{orderData.customer.shippingAddress}</p>
                                <p>{[orderData.customer.shippingPostalCode, orderData.customer.shippingCity].filter(Boolean).join(' ')}</p>
                                <p>{orderData.customer.shippingCountry}</p>
                                {orderData.customer.deliveryInstructions && <div className="mt-3 border-t border-blue-100 pt-3"><h4 className="font-semibold">Pokyny k doručení</h4><p className="whitespace-pre-wrap break-words">{orderData.customer.deliveryInstructions}</p></div>}
                            </div>
                        )}
                    </div>
                )}


                {!completed && <div className="border-t pt-5">
                    {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">{error}</div>}
                    {!ready && <button onClick={() => setReload(n => n + 1)} className="mb-4 min-h-11 text-blue-700 underline">Znovu načíst údaje</button>}
                    {!validCustomer && <p className="mb-4 text-red-800">Před odesláním doplňte jméno a e-mail v profilu.</p>}
                    {orderData.attempted && !processing && <p className="mb-4 text-sm text-slate-700">Nejprve ověřte výsledek původního pokusu opakováním nebo v historii. Obsah tohoto pokusu zůstává zachovaný.</p>}
                    <p role="status" aria-live="polite" className="mb-4 text-sm text-slate-600">{processing ? 'Odesíláme objednávku. Vyčkejte prosím na výsledek, nejvýše 30 sekund.' : 'Odesláním předáte objednávku ke zpracování.'}</p>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        {!orderData.attempted && <button onClick={() => router.push('/order-summary')} disabled={processing} className="min-h-12 rounded-lg border px-5 py-3 text-slate-700 disabled:opacity-50">Upravit souhrn</button>}
                        {error && <Link href="/my-orders" className="inline-flex min-h-12 items-center justify-center px-4 text-blue-700 underline">Ověřit v historii</Link>}
                        <button onClick={() => void handleConfirmOrder()} disabled={processing || !ready || !validCustomer} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
                            {processing && <Loader2 className="h-5 w-5 animate-spin" />}{processing ? 'Odesíláme…' : orderData.attempted ? 'Ověřit / zopakovat odeslání' : 'Odeslat objednávku'}
                        </button>
                    </div>
                </div>}
            </div>
        </CustomerPageShell>
    );
}
