'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import Header from '@/components/Header';
import ProductList from '@/components/ProductList';
import OrderForm from '@/components/OrderForm';
import AdminProducts from '@/components/AdminProducts';
import AuthDialog from '@/components/AuthDialog';
import { sortCatalogProducts } from '@/lib/product-config';
import { archiveProduct, createProduct, deleteProduct, restoreProduct, updateProduct } from '@/lib/products';
import { useCart } from '@/contexts/CartContext';
import SiteFooter from '@/components/SiteFooter';
import CustomerPageState from '@/components/CustomerPageState';
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from '@/lib/analytics/client';

export default function Home() {
   const cartContext = useCart();
   const { user, profile } = useAuth();
   const [currentView] = useState<'catalog' | 'order' | 'admin'>('catalog');
   const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
   const [isLoading, setIsLoading] = useState(true);
   const [linkedProductId, setLinkedProductId] = useState<string | null>(null);

   const {
       cartItems,
       products, setProducts,
       totalVolume,
       addToCart,
       removeFromCart,
       clearCart
   } = cartContext;

   const loadProducts = async () => {
       try {
           setIsLoading(true);
           const { data, error } = await supabase
               .from('products')
               .select('*')
               .eq('is_archived', false)
               .order('is_new', { ascending: false })
               .order('is_featured', { ascending: false })
               .order('sort_priority', { ascending: false })
               .order('name');

           if (error) {
               throw error;
           }

           setProducts(sortCatalogProducts(data || []));
       } catch (error) {
           console.error('Error loading products:', error);
       } finally {
           setIsLoading(false);
       }
   };

   useEffect(() => {
       loadProducts();
   }, []);

   useEffect(() => {
       setLinkedProductId(new URLSearchParams(window.location.search).get('produkt'));
   }, []);

   useEffect(() => {
       if (!user) return;
       trackAnalyticsEvent(ANALYTICS_EVENTS.catalogOpened, {
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

           <main className="container mx-auto flex-1 px-4 py-6">
               {currentView === 'catalog' && (
                   <ProductList
                       onAddToCart={addToCart}
                       onRemoveFromCart={removeFromCart}
                       cartItems={cartItems}
                       products={products}
                       initialProductId={linkedProductId}
                   />
               )}

               {currentView === 'order' && (
                   <OrderForm
                       cartItems={cartItems}
                       products={products}
                       onRemoveFromCart={removeFromCart}
                       onAddToCart={addToCart}
                       onClearCart={clearCart}
                       totalVolume={totalVolume}
                       user={user}
                       profile={profile}
                   />
               )}

               {currentView === 'admin' && profile?.is_admin && (
                   <AdminProducts
                       products={products}
                       onProductsChange={loadProducts}
                       onAddProduct={createProduct}
                       onUpdateProduct={async (product) => {
                           const { id, ...updates } = product;
                           return updateProduct(id, updates);
                       }}
                       onDeleteProduct={deleteProduct}
                       onArchiveProduct={archiveProduct}
                       onRestoreProduct={restoreProduct}
                   />
               )}
           </main>

           <SiteFooter />

           <AuthDialog
               isOpen={isLoginDialogOpen}
               onClose={() => setIsLoginDialogOpen(false)}
           />
       </div>
   );
}
