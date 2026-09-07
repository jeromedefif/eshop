'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Loader2, Mail, X } from 'lucide-react';
import { toast } from 'react-toastify';
import ProductMultiSelect, { type ProductSelectOption } from '@/components/ProductMultiSelect';
import { buildOrderCatalogUrl } from '@/lib/catalog-product-links';
import { normalizeProductCategory } from '@/lib/product-config';
import { sortOrderItems } from '@/lib/order-item-sorting';

type MessageType = 'general' | 'clarification' | 'delivery' | 'new-product';

type OrderItem = {
  id: string;
  quantity: number;
  volume: string | number;
  product: { name: string; category: string };
};

type OrderForEmail = {
  id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_company?: string | null;
  total_volume: string | number;
  note?: string | null;
  order_items?: OrderItem[];
};

type Props = {
  open: boolean;
  order: OrderForEmail;
  onClose: () => void;
};

const messageTypeLabels: Record<MessageType, string> = {
  general: 'Obecná odpověď',
  clarification: 'Upřesnění objednávky',
  delivery: 'Informace o termínu dodání',
  'new-product': 'Upozornění na nový produkt',
};

function formatVolume(volume: string | number, category: string) {
  const normalizedCategory = normalizeProductCategory(category);
  if (normalizedCategory === 'PET') return 'balení';
  if (normalizedCategory === 'Plyny') return String(volume).toLowerCase().includes('mal') ? 'malý' : 'velký';
  return /l\s*$/i.test(String(volume)) ? String(volume) : `${volume}L`;
}

function createMessage(order: OrderForEmail, type: MessageType, products: ProductSelectOption[]) {
  const shortOrderId = order.id.slice(0, 8).toUpperCase();
  const customer = [order.customer_name, order.customer_company].filter(Boolean).join(', ');
  const selectedProducts = products.length > 0
    ? `\n\nDoporučené produkty:\n${products.map((product) => `• ${product.name} (${product.category})`).join('\n')}\n\nVybrané produkty zobrazíte v objednávkovém katalogu zde:\n${buildOrderCatalogUrl(products.map((product) => product.id))}`
    : '';

  const introduction: Record<MessageType, string> = {
    general: `reaguji na Vaši objednávku č. ${shortOrderId} ze dne ${new Date(order.created_at).toLocaleDateString('cs-CZ')}.\n\n[doplňte zprávu]`,
    clarification: `pro dokončení zpracování Vaší objednávky č. ${shortOrderId} bych potřeboval upřesnit:\n\n[doplňte dotaz]`,
    delivery: `rád bych Vás informoval o termínu dodání Vaší objednávky č. ${shortOrderId}:\n\n[doplňte termín nebo informace k dodání]`,
    'new-product': `rádi bychom Vás upozornili na nové produkty v našem objednávkovém katalogu.`,
  };

  const subjectPrefix: Record<MessageType, string> = {
    general: 'Objednávka Beginy.cz',
    clarification: 'Upřesnění objednávky Beginy.cz',
    delivery: 'Termín dodání objednávky Beginy.cz',
    'new-product': 'Novinky v katalogu Beginy.cz',
  };

  return {
    subject: `${subjectPrefix[type]} – ${customer} – ${shortOrderId}`,
    body: `Dobrý den,\n\n${introduction[type]}${selectedProducts}\n\nS pozdravem\n\nRoman Fiala\nVINARIA s.r.o. – Beginy.cz`,
  };
}

function createOrderSummary(order: OrderForEmail) {
  const items = sortOrderItems(order.order_items || []).map((item) => {
    const volume = formatVolume(item.volume, item.product.category);
    return `• ${item.quantity}x ${volume} ${item.product.name}`;
  });

  return [
    `Objednávka č. ${order.id.slice(0, 8).toUpperCase()}`,
    `Datum: ${new Date(order.created_at).toLocaleDateString('cs-CZ')}`,
    `Zákazník: ${[order.customer_name, order.customer_company].filter(Boolean).join(', ')}`,
    '',
    'Položky objednávky:',
    ...items,
    '',
    `Celkový objem: ${order.total_volume} L`,
    order.note?.trim() ? `Poznámka zákazníka: ${order.note.trim()}` : '',
  ].filter((line, index, all) => line || all[index - 1] !== '').join('\n').trim();
}

export default function OrderEmailComposer({ open, order, onClose }: Props) {
  const [messageType, setMessageType] = useState<MessageType>('general');
  const [products, setProducts] = useState<ProductSelectOption[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  const selectedProducts = useMemo(() => {
    const selected = new Set(selectedProductIds);
    return products.filter((product) => selected.has(product.id));
  }, [products, selectedProductIds]);

  useEffect(() => {
    if (!open) return;
    setMessageType('general');
    setSelectedProductIds([]);
    const initial = createMessage(order, 'general', []);
    setSubject(initial.subject);
    setBody(initial.body);

    if (products.length === 0) {
      setLoadingProducts(true);
      fetch('/api/products', { cache: 'no-store' })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Produkty se nepodařilo načíst.');
          setProducts((data || []).map((product: { id: string; name: string; category: string }) => ({
            id: String(product.id),
            name: product.name,
            category: normalizeProductCategory(product.category),
          })));
        })
        .catch((error) => toast.error(error instanceof Error ? error.message : 'Produkty se nepodařilo načíst.'))
        .finally(() => setLoadingProducts(false));
    }
  }, [open, order, products.length]);

  useEffect(() => {
    if (!open) return;
    const next = createMessage(order, messageType, selectedProducts);
    setSubject(next.subject);
    setBody(next.body);
  }, [messageType, open, order, selectedProducts]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  const openEmailClient = () => {
    if (messageType === 'new-product' && selectedProductIds.length === 0) {
      toast.error('Pro upozornění na novinku vyberte alespoň jeden produkt.');
      return;
    }
    const href = `mailto:${encodeURIComponent(order.customer_email)}?subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(body.trim())}`;
    window.location.href = href;
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(createOrderSummary(order));
      toast.success('Souhrn objednávky byl zkopírován.');
    } catch (error) {
      console.error('Order summary copy error:', error);
      toast.error('Souhrn objednávky se nepodařilo zkopírovat.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="email-composer-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 id="email-composer-title" className="flex items-center gap-2 text-xl font-bold text-slate-950"><Mail className="h-5 w-5 text-blue-600" /> Napsat zákazníkovi</h2>
            <p className="mt-1 text-sm text-slate-600">Komu: <strong>{order.customer_email}</strong></p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Zavřít"><X className="h-5 w-5" /></button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-5 md:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-800">Typ zprávy</span>
              <select value={messageType} onChange={(event) => setMessageType(event.target.value as MessageType)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                {Object.entries(messageTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <div>
              <span className="mb-1.5 block text-sm font-semibold text-slate-800">Produkty v katalogu <span className="font-normal text-slate-500">(volitelné)</span></span>
              {loadingProducts ? (
                <div className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" /> Načítání produktů…</div>
              ) : (
                <ProductMultiSelect products={products} selectedIds={selectedProductIds} onChange={setSelectedProductIds} maxSelected={10} />
              )}
              {messageType === 'new-product' && <p className="mt-1 text-xs font-medium text-amber-700">Pro tento typ zprávy vyberte alespoň jeden produkt.</p>}
            </div>
          </div>

          <label className="mt-5 block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-800">Předmět</span>
            <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={250} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </label>

          <label className="mt-5 block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-800">Text zprávy</span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={14} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            <span className="mt-1 block text-xs text-slate-500">Změna typu zprávy nebo výběru produktů znovu připraví navržený text.</span>
          </label>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <button type="button" onClick={() => void copySummary()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"><Copy className="h-4 w-4" /> Kopírovat souhrn objednávky</button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button type="button" onClick={onClose} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-slate-700 hover:bg-slate-200">Zrušit</button>
            <button type="button" onClick={openEmailClient} disabled={!subject.trim() || !body.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"><ExternalLink className="h-4 w-4" /> Otevřít v e-mailovém klientovi</button>
          </div>
        </div>
      </div>
    </div>
  );
}
