'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import Header from '@/components/Header';
import ProductList from '@/components/ProductList';
import OrderForm from '@/components/OrderForm';
import AdminProducts from '@/components/AdminProducts';
import AuthDialog from '@/components/AuthDialog';
import SuccessNotification from '@/components/SuccessNotification';
import type { Product } from '@/types/database';

export const CartContext = createContext<{
   cartItems: {[key: string]: number};
   setCartItems: (items: {[key: string]: number} | ((prev: {[key: string]: number}) => {[key: string]: number})) => void;
   products: Product[];
   setProducts: (products: Product[]) => void;
   totalVolume: number;
} | null>(null);

const defaultCartItems: {[key: string]: number} = {};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
   const [cartItems, setCartItems] = useState<{[key: string]: number}>(defaultCartItems);
   const [products, setProducts] = useState<Product[]>([]);
   const [totalVolume, setTotalVolume] = useState(0);

   // Načtení košíku z localStorage
   useEffect(() => {
       try {
           const savedCart = localStorage.getItem('cart');
           if (savedCart) {
               setCartItems(JSON.parse(savedCart));
           }
       } catch (error) {
           console.error('Error loading cart from localStorage:', error);
           setCartItems(defaultCartItems);
       }
   }, []);

   // Uložení košíku do localStorage při změně
   useEffect(() => {
       try {
           localStorage.setItem('cart', JSON.stringify(cartItems));
       } catch (error) {
           console.error('Error saving cart to localStorage:', error);
       }
   }, [cartItems]);

   // Výpočet celkového objemu
   const getTotalVolume = () => {
       return Object.entries(cartItems).reduce((total, [keyString, count]) => {
           const [, volume] = keyString.split('-');
           if (volume === 'maly' || volume === 'velky' || volume === 'baleni') {
               return total;
           }
           return total + (parseInt(volume as string) * count);
       }, 0);
   };

   useEffect(() => {
       setTotalVolume(getTotalVolume());
   }, [cartItems]);

   return (
       <CartContext.Provider value={{
           cartItems,
           setCartItems,
           products,
           setProducts,
           totalVolume
       }}>
           {children}
       </CartContext.Provider>
   );
};

export default function Home() {
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
               .order('name');

           if (error) {
               throw error;
           }

           setProducts(data || []);
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

   const handleViewChange = (view: 'catalog' | 'order') => {
       if (profile?.is_admin) {
           setCurrentView('catalog');
       } else {
           setCurrentView(view);
       }
   };

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
       setCartItems(defaultCartItems);
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
                   onViewChange={handleViewChange}
                   currentView={currentView === 'admin' ? 'catalog' : currentView}
                   totalVolume={totalVolume}
                   onRemoveFromCart={handleRemoveFromCart}
                   onClearCart={handleClearCart}
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
                       onAddProduct={async (product) => {
                           const { error } = await supabase
                               .from('products')
                               .insert([{
                                   name: product.name,
                                   category: product.category,
                                   in_stock: product.in_stock
                               }]);

                           if (error) {
                               console.error('Error adding product:', error);
                               return;
                           }

                           await loadProducts();
                       }}
                       onUpdateProduct={async (product) => {
                           const { error } = await supabase
                               .from('products')
                               .update({
                                   name: product.name,
                                   category: product.category,
                                   in_stock: product.in_stock
                               })
                               .eq('id', product.id);

                           if (error) {
                               console.error('Error updating product:', error);
                               return;
                           }

                           await loadProducts();
                       }}
                       onDeleteProduct={async (id) => {
                           const { error } = await supabase
                               .from('products')
                               .delete()
                               .eq('id', id);

                           if (error) {
                               console.error('Error deleting product:', error);
                               return;
                           }

                           await loadProducts();
                       }}
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
