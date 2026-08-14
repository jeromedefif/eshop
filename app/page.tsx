'use client';

import { useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import Header from '@/components/Header';
import ProductList from '@/components/ProductList';
import OrderForm from '@/components/OrderForm';
import AdminProducts from '@/components/AdminProducts';
import AuthDialog from '@/components/AuthDialog';
import SuccessNotification from '@/components/SuccessNotification';
import type { Product } from '@/types/database';
import { getAllowedVolumes, sortCatalogProducts } from '@/lib/product-config';
import { archiveProduct, createProduct, deleteProduct, restoreProduct, updateProduct } from '@/lib/products';
import { CartContext } from '@/contexts/CartContext';

export default function Home() {
   const router = useRouter();
   const cartContext = useContext(CartContext);
   const { user, profile } = useAuth();
   const [currentView, setCurrentView] = useState<'catalog' | 'order' | 'admin'>('catalog');
   const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
   const [isLoading, setIsLoading] = useState(true);

   if (!cartContext) {
       return null;
   }

   const {
       cartItems, setCartItems,
       products, setProducts,
       totalVolume
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
       // Odstranili jsme kód pro toast, protože používáme vlastní SuccessNotification komponentu
   }, []);

   const handleAddToCart = (productId: string | number, volume: number | string) => {
       setCartItems(prev => {
           const key = `${productId}-${volume}`;
           const product = products.find((item) => String(item.id) === String(productId));
           const minimumQuantity = product?.min_order_qty || 1;
           const currentQuantity = prev[key] || 0;
           return {
               ...prev,
               [key]: currentQuantity === 0 ? minimumQuantity : currentQuantity + 1
           };
       });
   };

   const handleRemoveFromCart = (productId: string | number, volume: number | string) => {
       setCartItems(prev => {
           const key = `${productId}-${volume}`;
           const currentCount = prev[key] || 0;
           const product = products.find((item) => String(item.id) === String(productId));
           const minimumQuantity = product?.min_order_qty || 1;

           if (currentCount <= minimumQuantity) {
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

   const handleQuickReorder = async () => {
       if (!user) {
           router.push('/login');
           return;
       }

       try {
           const { data, error } = await supabase
               .from('orders')
               .select(`
                   id,
                   created_at,
                   status,
                   order_items (
                       id,
                       product_id,
                       volume,
                       quantity,
                       product:products (
                           id,
                           name,
                           category,
                           in_stock,
                           is_archived,
                           allowed_volumes
                       )
                   )
               `)
               .eq('user_id', user.id)
               .in('status', ['confirmed', 'completed'])
               .order('created_at', { ascending: false })
               .limit(1);

           if (error) {
               throw error;
           }

           const latestOrder = data?.[0];
           if (!latestOrder) {
               alert('Nemáte žádnou předchozí objednávku k opakování.');
               return;
           }

           const nextCartItems: { [key: string]: number } = {};
           let unavailableItems = 0;

           latestOrder.order_items.forEach((item: any) => {
               if (!item.product?.in_stock || item.product?.is_archived || !getAllowedVolumes(item.product).includes(String(item.volume))) {
                   unavailableItems += 1;
                   return;
               }

               const key = `${item.product_id}-${item.volume}`;
               nextCartItems[key] = item.quantity;
           });

           if (Object.keys(nextCartItems).length === 0) {
               alert('Poslední objednávka obsahuje pouze nedostupné položky.');
               return;
           }

           setCartItems(nextCartItems);

           if (unavailableItems > 0) {
               alert('Některé položky nebyly skladem a nebyly přidány.');
           }

           router.push('/order-summary');
       } catch (error) {
           console.error('Error creating reorder from latest order:', error);
           alert('Objednávku se nepodařilo načíst. Zkuste to prosím znovu.');
       }
   };

   if (isLoading) {
       return (
           <div className="min-h-screen bg-gray-50 flex justify-center items-center">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
           </div>
       );
   }

   return (
       <div className="min-h-screen bg-gray-50">
           <SuccessNotification />
           <div className="sticky top-0 z-50">
               <Header
                   cartItems={cartItems}
                   products={products}
                   totalVolume={totalVolume}
                   onRemoveFromCart={handleRemoveFromCart}
                   onClearCart={handleClearCart}
                   onQuickReorder={handleQuickReorder}
               />
           </div>

           <main className="container mx-auto px-4 py-6">
               {currentView === 'catalog' && (
                   <ProductList
                       onAddToCart={handleAddToCart}
                       onRemoveFromCart={handleRemoveFromCart}
                       cartItems={cartItems}
                       products={products}
                   />
               )}

               {currentView === 'order' && (
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

           <AuthDialog
               isOpen={isLoginDialogOpen}
               onClose={() => setIsLoginDialogOpen(false)}
           />
       </div>
   );
}
