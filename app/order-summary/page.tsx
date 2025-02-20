'use client';

import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CartContext } from '../page';
import OrderForm from '@/components/OrderForm';
import Header from '@/components/Header';

const OrderSummaryPage = () => {
    const router = useRouter();
    const { user, profile } = useAuth();
    const cartContext = useContext(CartContext);

    if (!cartContext) {
        return null;
    }

    const {
        cartItems,
        setCartItems,
        products,
        totalVolume
    } = cartContext;

   const handleAddToCart = (productId: number, volume: number | string) => {
       setCartItems(prev => {
           const key = `${productId}-${volume}`;
           return {
               ...prev,
               [key]: (prev[key] || 0) + 1
           };
       });
   };

   const handleRemoveFromCart = (productId: number, volume: number | string) => {
       setCartItems(prev => {
           const key = `${productId}-${volume}`;
           const currentCount = prev[key] || 0;

           if (currentCount <= 1) {
               const newCart = Object.fromEntries(
                   Object.entries(prev).filter(([k]) => k !== key)
               );
               return newCart;
           }

           return {
               ...prev,
               [key]: currentCount - 1
           };
       });
   };

   const handleClearCart = () => {
       setCartItems({});
   };

   // Přesměrování zpět na hlavní stránku, pokud je košík prázdný
   useEffect(() => {
       if (Object.keys(cartItems).length === 0) {
           router.push('/');
       }
   }, [cartItems, router]);

   return (
         <div className="min-h-screen bg-gray-50">
             <div className="sticky top-0 z-50">
                 <Header
                     cartItems={cartItems}
                     products={products}
                     currentView="order"
                     onViewChange={() => {}}
                     totalVolume={totalVolume}
                     onRemoveFromCart={handleRemoveFromCart}
                     onClearCart={handleClearCart}
                 />
             </div>

             <main className="container mx-auto px-4 py-6">
                 <div className="max-w-4xl mx-auto">
                     <h1 className="text-2xl font-bold text-gray-900 mb-6">Souhrn objednávky</h1>

                     {/* Odstraníme samostatný OrderSummary, protože je součástí OrderForm */}
                     <OrderForm
                         cartItems={cartItems}
                         products={products}
                         onRemoveFromCart={handleRemoveFromCart}
                         onAddToCart={handleAddToCart}
                         onClearCart={handleClearCart}
                         totalVolume={totalVolume}
                         user={user}
                         profile={profile}
                     />
                 </div>
             </main>
         </div>
     );
 };

 export default OrderSummaryPage;
