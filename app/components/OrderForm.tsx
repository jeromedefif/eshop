'use client';

import { draftKey, noteKey, parseDraft, sameDraftContents } from '@/lib/orders/draft';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OrderSummary from './OrderSummary';
import CheckoutSteps from './CheckoutSteps';
import type {
  OrderFormProps,
  OrderConfirmationData
} from '@/types/orders';
import Link from 'next/link';
import { History, Plus } from 'lucide-react';
import { sortOrderItems } from '@/lib/order-item-sorting';
import { customerFromProfile } from '@/lib/orders/customer';
import { normalizeProductCategory } from '@/lib/product-config';
import UsuallyOrderedRecommendations from './UsuallyOrderedRecommendations';

const OrderForm = ({
  cartItems,
  products,
  onRemoveFromCart,
  onAddToCart,
  totalVolume,
  user,
  profile
}: OrderFormProps) => {
  const [note, setNote] = useState('');
  const router = useRouter();
  const [error, setError] = useState('');
  const [noteReady, setNoteReady] = useState(false);
  useEffect(() => {
    try {
      const draft = user ? parseDraft(sessionStorage.getItem(draftKey(user.id)), user.id) : null;
      setNote(user ? sessionStorage.getItem(noteKey(user.id)) ?? (draft?.completedOrderId ? '' : draft?.customer.note || '') : '');
    } catch { setError('Prohlížeč nepovoluje uložení rozpracované objednávky. Povolte úložiště webu a zkuste to znovu.'); }
    setNoteReady(true);
  }, [user]);
  const changeNote = (value: string) => {
    setNote(value);
    if (user) try { sessionStorage.setItem(noteKey(user.id), value); } catch { setError('Poznámku se nepodařilo uložit. Povolte úložiště webu před pokračováním.'); }
  };

  const reviewDisabled = Object.keys(cartItems).length === 0 || !user || !profile?.full_name || !profile?.email || !noteReady;

  const handleSubmit = async () => {

      if (reviewDisabled || !user || !profile) {
          return;
      }

      setError('');
      try {
          const prior = parseDraft(sessionStorage.getItem(draftKey(user.id)), user.id);
          if (!prior?.attempted || prior.completedOrderId) {
              const orderData = getOrderSummary();
              const requestKey = prior && !prior.completedOrderId && sameDraftContents(prior, orderData) ? prior.requestKey : crypto.randomUUID();
              sessionStorage.setItem(draftKey(user.id), JSON.stringify({ ...orderData, userId: user.id, requestKey, createdAt: Date.now() }));
          }
          router.push('/order-confirmation');
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Koncept objednávky se nepodařilo uložit.');
      }
  };

  const getOrderSummary = (): OrderConfirmationData => {
      const lines = Object.entries(cartItems).map(([key, quantity]) => {
          const [id, volume] = key.split('-');
          const product = products.find(p => String(p.id) === id);
          if (!product) throw new Error('Některá položka již není v katalogu. Obnovte katalog a upravte košík.');
          return { product, volume, quantity };
      });
      const items = sortOrderItems(lines).map(({ product, volume, quantity }) => {
          const category = normalizeProductCategory(product.category);
          const display = category === 'PET'
              ? `${quantity}× balení`
              : category === 'Plyny'
                  ? `${quantity}× ${volume === 'maly' ? 'malý' : 'velký'}`
                  : `${volume}L × ${quantity}`;

          return {
              productId: Number(product.id),
              productName: product.name,
              productCategory: category,
              volume: volume as string | number,
              quantity,
              display
          };
      });

      return {
          items,
          totalVolume,
          customer: { ...customerFromProfile(profile!), note }
      };
  };

  return (
      <>
      <CheckoutSteps current={1} onReview={handleSubmit} reviewDisabled={reviewDisabled} />
      <div className="space-y-6">
          <OrderSummary
              cartItems={cartItems}
              products={products}
              onRemoveFromCart={onRemoveFromCart}
              onAddToCart={onAddToCart}
              totalVolume={totalVolume}
          />

          {user && (
              <UsuallyOrderedRecommendations
                  userId={user.id}
                  cartItems={cartItems}
                  products={products}
                  onAddToCart={onAddToCart}
              />
          )}

          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                  <h2 className="font-semibold text-slate-950">Chcete ještě něco přidat?</h2>
                  <p className="mt-1 text-sm text-slate-600">Vybrané položky zůstanou v košíku.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Link href="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-100">
                      <Plus aria-hidden="true" className="h-4 w-4" />Doplnit z katalogu
                  </Link>
                  {user && <Link href="/my-orders" title="Historie, oblíbené a uložené šablony" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100">
                      <History aria-hidden="true" className="h-4 w-4" />Moje objednávky
                  </Link>}
              </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="p-6">
                  <div className="mb-6">
                      <label htmlFor="order-note" className="mb-2 block text-lg font-semibold text-gray-900">Poznámka k objednávce</label>
                      <textarea
                          id="order-note"
                          maxLength={5000}
                          value={note}
                          onChange={(e) => changeNote(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                          rows={3}
                          placeholder="Další informace k objednávce..."
                      />
                  </div>

                  {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
                  {!user ? <Link href="/login" className="mb-4 block font-semibold text-blue-700 underline">Přihlásit se</Link> : (!profile?.full_name || !profile?.email) && <p className="mb-4 text-slate-700">Pro pokračování doplňte jméno a e-mail. <Link href="/my-profile?checkout=1" className="font-semibold text-blue-700 underline">Upravit údaje</Link></p>}
                  <p className="mb-3 text-sm text-slate-600">Objednávka se odešle až v následujícím kroku.</p>
                  <button
                      onClick={handleSubmit}
                      disabled={reviewDisabled}
                      className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg
                               hover:bg-blue-700 transition-colors disabled:bg-gray-400
                               disabled:cursor-not-allowed"
                  >
                      {!user
                          ? 'Pro odeslání objednávky se prosím přihlaste'
                          : Object.keys(cartItems).length === 0
                              ? 'Nejdříve přidejte položky do košíku'
                              : 'Pokračovat ke kontrole'
                      }
                  </button>
              </div>
          </div>
      </div>
      </>
  );
};

export default OrderForm;
