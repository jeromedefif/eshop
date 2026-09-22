'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import ProductList from '@/components/ProductList';
import { useCart } from '@/contexts/CartContext';
import SiteFooter from '@/components/SiteFooter';
import CustomerPageState from '@/components/CustomerPageState';
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from '@/lib/analytics/client';
import { SITE_CONTAINER_CLASS } from '@/lib/layout-classes';
import { readCatalogProductIds } from '@/lib/catalog-product-links';

export default function Home() {
   const cartContext = useCart();
   const { user } = useAuth();
   const [linkedProductIds, setLinkedProductIds] = useState<string[]>([]);

   const {
       cartItems,
       products, isProductsLoading: isLoading, productsError,
       addToCart,
       removeFromCart
   } = cartContext;

   useEffect(() => {
       setLinkedProductIds(readCatalogProductIds(new URLSearchParams(window.location.search)));
   }, []);

   useEffect(() => {
       if (!user) return;
       void trackAnalyticsEvent(ANALYTICS_EVENTS.catalogOpened, {
           source: 'catalog',
           oncePerJourney: true,
       });
   }, [user]);

   if (isLoading) {
       return (
           <CustomerPageState
               loading
               title="Načítáme katalog produktů"
               description="Připravujeme aktuální nabídku a dostupné objemy."
           />
       );
   }

   return (
       <div className="min-h-screen bg-gray-50 flex flex-col">
           <Header />

           <main className={`${SITE_CONTAINER_CLASS} flex-1 py-6`}>
               {productsError && <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-4 text-amber-900">{productsError}</p>}
               {(
                   <ProductList
                       onAddToCart={addToCart}
                       onRemoveFromCart={removeFromCart}
                       cartItems={cartItems}
                       products={products}
                       initialProductIds={linkedProductIds}
                   />
               )}

           </main>

           <SiteFooter />

       </div>
   );
}
