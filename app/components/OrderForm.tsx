'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import OrderSummary from './OrderSummary';
import type {
  OrderFormProps,
  OrderConfirmationData
} from '@/types/orders';

const OrderForm = ({
  cartItems,
  products,
  onRemoveFromCart,
  onAddToCart,
  onClearCart,
  totalVolume,
  user,
  profile
}: OrderFormProps) => {
  const [note, setNote] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!user || !profile || Object.keys(cartItems).length === 0) {
          return;
      }

      // Vytvořit data objednávky
      const orderData = getOrderSummary();

      // Uložit data do localStorage pro následující stránku
      localStorage.setItem('pendingOrderData', JSON.stringify(orderData));

      // Přesměrovat na stránku potvrzení objednávky
      router.push('/order-confirmation');
  };

  const getOrderSummary = (): OrderConfirmationData => {
      const items = Object.entries(cartItems).map(([key, quantity]) => {
          const [productId, volume] = key.split('-');
          const product = products.find(p => p.id === parseInt(productId));
          if (!product) return null;

          const display = product.category === 'PET'
              ? `${quantity}× balení`
              : product.category === 'Dusík'
                  ? `${quantity}× ${volume === 'maly' ? 'malý' : 'velký'}`
                  : `${volume}L × ${quantity}`;

          return {
              productId: parseInt(productId),
              productName: product.name,
              volume: volume as string | number,
              quantity,
              display
          };
      }).filter((item): item is NonNullable<typeof item> => item !== null);

      return {
          items,
          totalVolume,
          customer: {
              name: profile?.full_name || '',
              email: profile?.email || '',
              phone: profile?.phone || '',
              company: profile?.company || '',
              note: note
          }
      };
  };

  return (
      <div className="max-w-4xl mx-auto p-4">
          <OrderSummary
              cartItems={cartItems}
              products={products}
              onRemoveFromCart={onRemoveFromCart}
              onAddToCart={onAddToCart}
              totalVolume={totalVolume}
          />

          <div className="mt-6 bg-white rounded-lg shadow">
              <div className="p-6">
                  <div className="mb-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">Poznámka k objednávce</h2>
                      <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                          rows={3}
                          placeholder="Další informace k objednávce..."
                      />
                  </div>

                  <button
                      onClick={handleSubmit}
                      disabled={Object.keys(cartItems).length === 0 || !user}
                      className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg
                               hover:bg-blue-700 transition-colors disabled:bg-gray-400
                               disabled:cursor-not-allowed"
                  >
                      {!user
                          ? 'Pro odeslání objednávky se prosím přihlaste'
                          : Object.keys(cartItems).length === 0
                              ? 'Nejdříve přidejte položky do košíku'
                              : 'Přejít k potvrzení objednávky'
                      }
                  </button>
              </div>
          </div>
      </div>
  );
};

export default OrderForm;
