'use client';

import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, CheckCircle, Loader2, Truck, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { draftKey, noteKey, parseDraft, sameDraftContents, type OrderDraft } from '@/lib/orders/draft';
import { orderDataFromCart, prepareOrderDraft } from '@/lib/orders/prepare-draft';
import { CheckoutSubmissionError, submitCheckoutDraft } from '@/lib/orders/submit-checkout';
import { checkoutAccessoryTotals } from '@/lib/orders/checkout-totals';
import { ANALYTICS_EVENTS, completeAnalyticsJourney, trackAnalyticsEvent } from '@/lib/analytics/client';

export default function QuickOrder() {
  const { user } = useAuth();
  const { cartItems, products, totalVolume, isCartHydrated, isProductsLoading, productsError, clearOrderedItems } = useCart();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<OrderDraft | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);
  const generation = useRef(0);
  const mounted = useRef(true);
  const owner = useRef(user?.id);
  owner.current = user?.id;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!processing) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const preventNavigation = (event: MouseEvent) => { if (event.target instanceof Element && event.target.closest('a')) event.preventDefault(); };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', preventNavigation, true);
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', preventNavigation, true); };
  }, [processing]);

  const entries = Object.entries(cartItems).filter(([, quantity]) => quantity > 0);
  const { petPackages, gasPieces } = checkoutAccessoryTotals(entries.map(([key, quantity]) => {
    const [id, volume] = key.split('-');
    return { productId: Number(id), volume, quantity, productName: '', display: '' };
  }), products);
  const disabled = !user || !entries.length || !isCartHydrated || isProductsLoading || Boolean(productsError) || loading || processing;

  const changeOpen = (value: boolean) => {
    if (busy.current && processing) return;
    if (!value) generation.current++;
    setOpen(value);
  };

  const openConfirmation = async () => {
    if (disabled || !user || busy.current) return;
    busy.current = true;
    const currentGeneration = ++generation.current;
    const current = () => mounted.current && owner.current === user.id && generation.current === currentGeneration;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    setError(''); setDraft(null); setReceipt(null); setLoading(true); setOpen(true);
    try {
      const prior = parseDraft(sessionStorage.getItem(draftKey(user.id)), user.id);
      if (prior?.attempted && !prior.completedOrderId) { router.push('/order-confirmation'); return; }
      const note = sessionStorage.getItem(noteKey(user.id)) ?? (prior?.completedOrderId ? '' : prior?.customer.note || '');
      const response = await fetch('/api/checkout', { cache: 'no-store', signal: controller.signal });
      const result = await response.json();
      if (!current()) return;
      if (!response.ok) throw new Error(result.error || 'Údaje se nepodařilo načíst.');
      if (result.userId !== user.id) throw new Error('Účet se změnil. Přihlaste se znovu.');
      const data = orderDataFromCart(cartItems, products, { ...result.customer, note });
      if (!data.customer.name || !data.customer.email) throw new Error('Před odesláním doplňte jméno a e-mail ve svém profilu.');
      const prepared = prepareOrderDraft(sessionStorage, user.id, data);
      if (prepared.attempted && !prepared.completedOrderId) { router.push('/order-confirmation'); return; }
      setDraft(prepared);
    } catch (e) {
      if (current()) setError(e instanceof Error && e.name !== 'AbortError' && !(e instanceof TypeError) ? e.message : 'Údaje se nepodařilo načíst. Zkontrolujte připojení a zkuste to znovu.');
    } finally {
      clearTimeout(timer); busy.current = false;
      if (mounted.current) setLoading(false);
    }
  };

  const submit = async () => {
    if (!user || !draft || draft.userId !== user.id || busy.current || receipt) return;
    busy.current = true;
    setProcessing(true); setError('');
    const current = () => mounted.current && owner.current === user.id;
    try {
      const latest = parseDraft(sessionStorage.getItem(draftKey(user.id)), user.id);
      if (!latest || latest.requestKey !== draft.requestKey || latest.completedOrderId || latest.attempted) {
        router.push('/order-confirmation'); return;
      }
      if (!sameDraftContents(draft, orderDataFromCart(cartItems, products, draft.customer))) throw new Error('Košík se změnil. Zavřete okno a otevřete rychlé objednání znovu.');
      const completed = await submitCheckoutDraft(draft, sessionStorage, current);
      if (!current()) return;
      setReceipt(completed);
      try { sessionStorage.removeItem(noteKey(user.id)); } catch { /* Accepted order remains valid. */ }
      try { clearOrderedItems(completed.items); } catch { /* The receipt remains available even if cart cleanup fails. */ }
      try {
        completeAnalyticsJourney();
        void trackAnalyticsEvent(ANALYTICS_EVENTS.orderSubmitted, { itemCount: completed.items.reduce((sum, item) => sum + item.quantity, 0), oncePerJourney: true }).catch(() => {});
      } catch { /* Telemetry cannot affect the receipt. */ }
      // Navigate only with a persisted receipt; never show a fresh submission form after success.
      try {
        const stored = parseDraft(sessionStorage.getItem(draftKey(user.id)), user.id);
        if (stored?.completedOrderId === completed.completedOrderId) router.push('/order-confirmation');
      } catch { /* Show the in-memory receipt instead. */ }
    } catch (e) {
      if (!current()) return;
      if (e instanceof CheckoutSubmissionError) setDraft(e.draft);
      setError(e instanceof Error ? e.message : 'Výsledek objednávky se nepodařilo ověřit.');
    } finally { busy.current = false; if (mounted.current) setProcessing(false); }
  };

  const uncertain = Boolean(draft?.attempted && !receipt);
  return <>
    <section aria-label="Rychlé objednání" className="mb-28 mt-5 rounded-2xl border border-blue-200 bg-blue-50/60 p-5 shadow-sm sm:mb-0 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950"><Zap aria-hidden="true" className="h-5 w-5 text-blue-700" />Máte vybráno? Objednejte rovnou.</h2>
          <p className="mt-1 text-sm text-slate-600">Odešlete celý košík s dodacími údaji z vašeho profilu.</p>
          <dl className="mt-4 flex flex-wrap gap-x-7 gap-y-3 text-sm">
            <div><dt className="text-slate-600">Vína a nápoje</dt><dd className="mt-1 text-lg font-bold text-slate-950">{totalVolume} litrů</dd></div>
            <div><dt className="text-slate-600">Celkem balení PET</dt><dd className="mt-1 text-lg font-bold text-slate-950">{petPackages} balení</dd></div>
            <div><dt className="text-slate-600">Celkem plynů</dt><dd className="mt-1 text-lg font-bold text-slate-950">{gasPieces} ks</dd></div>
          </dl>
        </div>
        <div className="flex flex-col gap-2 lg:min-w-60">
          <button ref={trigger} type="button" onClick={() => void openConfirmation()} disabled={disabled} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Zap aria-hidden="true" className="h-4 w-4" />Rychle objednat</button>
          <Link href="/order-summary" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-blue-700 hover:bg-blue-100">Přejít ke kontrole<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
        </div>
      </div>
      {!entries.length && <p className="mt-3 text-sm text-slate-600">Nejdříve přidejte položky do košíku.</p>}
    </section>
    {!open && entries.length > 0 && <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] sm:hidden">
      <button type="button" onClick={() => void openConfirmation()} disabled={disabled} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50"><Zap aria-hidden="true" className="h-4 w-4" />Rychle objednat</button>
    </div>}
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-sm" />
        <Dialog.Content onOpenAutoFocus={e => { e.preventDefault(); cancel.current?.focus(); }} onCloseAutoFocus={e => { e.preventDefault(); trigger.current?.focus(); }} onEscapeKeyDown={e => { if (processing) e.preventDefault(); }} onPointerDownOutside={e => { if (processing) e.preventDefault(); }} className="fixed left-1/2 top-1/2 z-[101] max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">{receipt ? <CheckCircle aria-hidden="true" /> : <Zap aria-hidden="true" />}</div>
          <Dialog.Title className="text-xl font-bold tracking-tight text-slate-950">{receipt ? 'Děkujeme, objednávku jsme přijali.' : 'Odeslat objednávku bez kontroly?'}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-slate-600">{receipt ? 'Objednávka je uložená. Potvrzení vám zašleme e-mailem.' : 'Objednávku odešleme s dodacími údaji uloženými ve vašem profilu.'}</Dialog.Description>
          {loading && <p role="status" className="mt-5 flex items-center gap-2 text-sm text-slate-600"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Načítáme aktuální dodací údaje…</p>}
          {draft && !receipt && <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            <p className="mb-2 flex items-center gap-2 font-semibold text-slate-950"><Truck aria-hidden="true" className="h-4 w-4" />Dodací místo</p>
            <p className="break-words">{draft.customer.shippingCompany || draft.customer.shippingContactName || draft.customer.name}</p>
            <p className="break-words">{draft.customer.shippingAddress || 'Adresa není vyplněna'}</p>
            <p>{[draft.customer.shippingPostalCode, draft.customer.shippingCity].filter(Boolean).join(' ')}</p>
            <p className="mt-3 border-t border-slate-200 pt-3 font-semibold">{draft.totalVolume} litrů · PET {checkoutAccessoryTotals(draft.items, products).petPackages} balení · Plyn {checkoutAccessoryTotals(draft.items, products).gasPieces} ks</p>
            {draft.customer.note && <p className="mt-2 whitespace-pre-wrap break-words"><span className="font-semibold">Poznámka: </span>{draft.customer.note}</p>}
          </div>}
          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">{error}</p>}
          {processing && <p role="status" className="mt-4 text-sm text-slate-600">Odesíláme objednávku. Vyčkejte prosím na výsledek.</p>}
          {receipt ? <Link href={`/my-orders#order-${receipt.completedOrderId}`} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-700 px-4 font-semibold text-white">Zobrazit objednávku</Link> : uncertain ? <Link href="/order-confirmation" className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-700 px-4 font-semibold text-white">Ověřit předchozí odeslání</Link> : <button type="button" onClick={() => void submit()} disabled={!draft || loading || processing} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{processing && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{processing ? 'Odesíláme…' : 'Objednat'}</button>}
          {!receipt && <Dialog.Close ref={cancel} disabled={processing} className="mt-2 min-h-11 w-full rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Zpět k úpravám</Dialog.Close>}
          {!loading && !processing && !receipt && <Link href={draft ? '/order-summary' : '/my-profile'} className="mt-1 inline-flex min-h-11 w-full items-center justify-center text-sm font-semibold text-blue-700 underline">{draft ? 'Přejít ke kontrole a úpravě údajů' : 'Upravit profil'}</Link>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>;
}
