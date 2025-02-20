'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import OrderConfirmationDialog from './OrderConfirmationDialog';
import OrderSummary from './OrderSummary';
import type {
   OrderFormProps,
   OrderStatus,
   OrderConfirmationData
} from '@/types/orders';

interface OrderData {
   user_id: string;
   total_volume: number;
   customer_name: string | null;
   customer_email: string;
   customer_phone: string | null;
   customer_company: string | null;
   note: string;
   status: 'pending';
}

interface OrderItem {
   order_id: string;
   product_id: number;
   volume: string;
   quantity: number;
}

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
   const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
   const [orderStatus, setOrderStatus] = useState<OrderStatus>('pending');
   const [note, setNote] = useState('');

   const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault();
       setIsConfirmationOpen(true);
   };

   const handleConfirmOrder = async () => {
       setOrderStatus('processing');
       try {
           if (!user || !profile) throw new Error('User not authenticated');

           const orderData: OrderData = {
               user_id: user.id,
               total_volume: totalVolume,
               customer_name: profile.full_name,
               customer_email: profile.email,
               customer_phone: profile.phone,
               customer_company: profile.company,
               note: note,
               status: 'pending'
           };

           console.log('Creating order with data:', orderData);

           const { data: order, error: orderError } = await supabase
               .from('orders')
               .insert([orderData])
               .select()
               .single();

           if (orderError) {
               console.error('Order creation error:', orderError);
               throw orderError;
           }

           console.log('Order created:', order);

           const orderItems: OrderItem[] = Object.entries(cartItems).map(([key, quantity]) => {
               const [productId, volume] = key.split('-');
               return {
                   order_id: order.id,
                   product_id: parseInt(productId),
                   volume: volume,
                   quantity: quantity
               };
           });

           console.log('Creating order items:', orderItems);

           const { data: items, error: itemsError } = await supabase
               .from('order_items')
               .insert(orderItems)
               .select();

           if (itemsError) {
               console.error('Order items creation error:', itemsError);
               await supabase.from('orders').delete().eq('id', order.id);
               throw itemsError;
           }

           console.log('Order items created:', items);

           try {
    console.log('Sending confirmation email for order:', order.id);

    const { error: emailError } = await supabase
        .functions
        .invoke('send-order-confirmation', {
            method: 'POST',  // přidáme metodu
            headers: {      // přidáme headers
                'Content-Type': 'application/json',
            },
            body: { orderId: order.id }  // odstraníme JSON.stringify
        });

    if (emailError) {
        console.error('Email sending error:', emailError);
    }
} catch (emailError) {
    console.error('Email function error:', emailError);
}

           setOrderStatus('completed');
           setTimeout(() => {
               setIsConfirmationOpen(false);
               onClearCart();
               setNote('');
           }, 2000);
       } catch (error) {
           console.error('Error:', error);
           setOrderStatus('error');
       }
   };

   const getOrderSummary = (): OrderConfirmationData => {
       const items = Object.entries(cartItems).map(([key, quantity]) => {
           const [productId, volume] = key.split('-');
           const product = products.find(p => p.id === parseInt(productId));
           if (!product) return null;

           return {
               productName: product.name,
               volume: volume as string | number,
               quantity,
               display: product.category === 'PET'
                   ? `${quantity}× balení`
                   : product.category === 'Dusík'
                       ? `${quantity}× ${volume === 'maly' ? 'malý' : 'velký'}`
                       : `${volume}L × ${quantity}`
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
                           className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                               : 'Odeslat objednávku'
                       }
                   </button>
               </div>
           </div>

           <OrderConfirmationDialog
               isOpen={isConfirmationOpen}
               onClose={() => {
                   if (orderStatus !== 'processing') {
                       setIsConfirmationOpen(false);
                       setOrderStatus('pending');
                   }
               }}
               onConfirm={handleConfirmOrder}
               orderData={getOrderSummary()}
               orderStatus={orderStatus}
           />
       </div>
   );
};

export default OrderForm;
