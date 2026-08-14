'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { sortCatalogProducts } from '@/lib/product-config';
import type { Product } from '@/types/database';

export type CartItems = Record<string, number>;

export type CartContextType = {
  cartItems: CartItems;
  setCartItems: React.Dispatch<React.SetStateAction<CartItems>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  totalVolume: number;
};

export const CartContext = createContext<CartContextType | null>(null);

const defaultCartItems: CartItems = {};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItems>(defaultCartItems);
  const [isCartHydrated, setIsCartHydrated] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalVolume, setTotalVolume] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
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

        if (isMounted) {
          setProducts(sortCatalogProducts(data || []));
        }
      } catch (error) {
        console.error('Error loading products in CartProvider:', error);
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Keep the production storage key and payload format for existing carts.
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      setCartItems(defaultCartItems);
    } finally {
      setIsCartHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isCartHydrated) {
      return;
    }

    try {
      localStorage.setItem('cart', JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [cartItems, isCartHydrated]);

  useEffect(() => {
    const volume = Object.entries(cartItems).reduce((total, [key, count]) => {
      const [, selectedVolume] = key.split('-');
      if (selectedVolume === 'maly' || selectedVolume === 'velky' || selectedVolume === 'baleni') {
        return total;
      }

      return total + parseInt(selectedVolume, 10) * count;
    }, 0);

    setTotalVolume(volume);
  }, [cartItems]);

  return (
    <CartContext.Provider
      value={{ cartItems, setCartItems, products, setProducts, totalVolume }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}
