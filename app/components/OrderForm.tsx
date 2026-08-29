'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import OrderSummary from './OrderSummary';
import type {
  OrderFormProps,
  OrderConfirmationData
} from '@/types/orders';
import { normalizeProductCategory } from '@/lib/product-config';

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
      const billingAddress = profile?.billing_address || profile?.address || '';
      const billingCity = profile?.billing_city || profile?.city || '';
      const billingPostalCode = profile?.billing_postal_code || profile?.postal_code || '';
      const billingCountry = profile?.billing_country || 'Česká republika';
      const useBillingForShipping = profile?.shipping_same_as_billing !== false;
      const items = Object.entries(cartItems).map(([key, quantity]) => {
          const [productId, volume] = key.split('-');
          const product = products.find(p => String(p.id) === productId);
          if (!product) return null;

          const category = normalizeProductCategory(product.category);
          const display = category === 'PET'
              ? `${quantity}× balení`
              : category === 'Plyny'
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
              companyId: profile?.company_id || '',
              vatId: profile?.vat_id || '',
              billingAddress,
              billingCity,
              billingPostalCode,
              billingCountry,
              shippingCompany: useBillingForShipping ? profile?.company || '' : profile?.shipping_company || '',
              shippingContactName: useBillingForShipping ? profile?.full_name || '' : profile?.shipping_contact_name || '',
              shippingAddress: useBillingForShipping ? billingAddress : profile?.shipping_address || '',
              shippingCity: useBillingForShipping ? billingCity : profile?.shipping_city || '',
              shippingPostalCode: useBillingForShipping ? billingPostalCode : profile?.shipping_postal_code || '',
              shippingCountry: useBillingForShipping ? billingCountry : profile?.shipping_country || billingCountry,
              deliveryInstructions: profile?.delivery_instructions || '',
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
