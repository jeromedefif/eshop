'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { sortCatalogProducts } from '@/lib/product-config';
import type { Product } from '@/types/database';
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from '@/lib/analytics/client';

export type CartItems = Record<string, number>;
export type CartImportResult = 'merged' | 'replaced' | 'cancelled';

export type CartContextType = {
  cartItems: CartItems;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  totalVolume: number;
  isCartHydrated: boolean;
  addToCart: (productId: string | number, volume: string | number) => void;
  removeFromCart: (productId: string | number, volume: string | number) => void;
  removeLineFromCart: (productId: string | number, volume: string | number) => void;
  clearCart: () => void;
  requestCartImport: (items: CartItems, sourceLabel: string) => Promise<CartImportResult>;
};

export const CartContext = createContext<CartContextType | null>(null);
const defaultCartItems: CartItems = {};

const sanitizeCart = (value: unknown): CartItems => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key, quantity]) => key.includes('-') && Number.isInteger(quantity) && Number(quantity) > 0)
      .map(([key, quantity]) => [key, Number(quantity)])
  );
};

const readStoredCart = (key: string) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? sanitizeCart(JSON.parse(stored)) : {};
  } catch (error) {
    console.error(`Error loading cart from ${key}:`, error);
    return {};
  }
};

type PendingImport = {
  items: CartItems;
  sourceLabel: string;
  resolve: (result: CartImportResult) => void;
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItems>(defaultCartItems);
  const [isCartHydrated, setIsCartHydrated] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalVolume, setTotalVolume] = useState(0);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const activeStorageKeyRef = useRef('cart');
  const hydrationIdRef = useRef(0);
  const { user } = useAuth();

  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products').select('*').eq('is_archived', false)
          .order('is_new', { ascending: false }).order('is_featured', { ascending: false })
          .order('sort_priority', { ascending: false }).order('name');
        if (error) throw error;
        if (isMounted) setProducts(sortCatalogProducts(data || []));
      } catch (error) {
        console.error('Error loading products in CartProvider:', error);
      }
    };
    void loadProducts();
    return () => { isMounted = false; };
  }, [user?.id]);

  useEffect(() => {
    const hydrationId = ++hydrationIdRef.current;
    const userId = user?.id || null;
    const storageKey = userId ? `cart:${userId}` : 'cart';
    activeStorageKeyRef.current = storageKey;
    setIsCartHydrated(false);

    const hydrateCart = async () => {
      const localCart = readStoredCart(storageKey);
      let nextCart = localCart;
      let canRemoveLegacyCart = false;
      if (userId) {
        const { data, error } = await supabase.from('customer_carts').select('items').eq('user_id', userId).maybeSingle();
        if (error) {
          console.error('Error loading server cart, using local fallback:', error);
        } else if (data) {
          nextCart = sanitizeCart(data.items);
          canRemoveLegacyCart = true;
        } else {
          const legacyCart = readStoredCart('cart');
          if (Object.keys(nextCart).length === 0 && Object.keys(legacyCart).length > 0) nextCart = legacyCart;
          if (Object.keys(nextCart).length > 0) {
            const { error: migrationError } = await supabase.from('customer_carts').upsert({
              user_id: userId, items: nextCart, updated_at: new Date().toISOString()
            });
            if (migrationError) console.error('Error migrating cart to server:', migrationError);
            else canRemoveLegacyCart = true;
          } else {
            canRemoveLegacyCart = true;
          }
        }
      }
      if (hydrationId !== hydrationIdRef.current) return;
      if (userId && canRemoveLegacyCart) {
        try {
          localStorage.removeItem('cart');
        } catch (error) {
          console.error('Error removing migrated legacy cart:', error);
        }
      }
      setCartItems(nextCart);
      setIsCartHydrated(true);
    };
    void hydrateCart();
  }, [user?.id]);

  useEffect(() => {
    if (!isCartHydrated) return;
    try {
      localStorage.setItem(activeStorageKeyRef.current, JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [cartItems, isCartHydrated]);

  useEffect(() => {
    if (!isCartHydrated || !user) return;
    const userId = user.id;
    const timer = window.setTimeout(async () => {
      const { error } = await supabase.from('customer_carts').upsert({
        user_id: userId, items: cartItems, updated_at: new Date().toISOString()
      });
      if (error) console.error('Error synchronizing cart:', error);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [cartItems, isCartHydrated, user]);

  useEffect(() => {
    const volume = Object.entries(cartItems).reduce((total, [key, count]) => {
      const selectedVolume = key.slice(key.lastIndexOf('-') + 1);
      if (['maly', 'velky', 'baleni'].includes(selectedVolume)) return total;
      const parsedVolume = Number.parseInt(selectedVolume, 10);
      return Number.isFinite(parsedVolume) ? total + parsedVolume * count : total;
    }, 0);
    setTotalVolume(volume);
  }, [cartItems]);

  const addToCart = useCallback((productId: string | number, volume: string | number) => {
    setCartItems((currentItems) => {
      const key = `${productId}-${volume}`;
      const product = products.find((item) => String(item.id) === String(productId));
      const minimumQuantity = product?.min_order_qty || 1;
      const currentQuantity = currentItems[key] || 0;
      const nextQuantity = currentQuantity === 0 ? minimumQuantity : currentQuantity + 1;
      const nextItems = { ...currentItems, [key]: nextQuantity };
      if (Object.keys(currentItems).length === 0) {
        trackAnalyticsEvent(ANALYTICS_EVENTS.firstItemAdded, {
          source: 'catalog',
          itemCount: Object.values(nextItems).reduce((sum, quantity) => sum + quantity, 0),
          oncePerJourney: true,
        });
      }
      return nextItems;
    });
  }, [products]);

  const removeFromCart = useCallback((productId: string | number, volume: string | number) => {
    setCartItems((currentItems) => {
      const key = `${productId}-${volume}`;
      const currentQuantity = currentItems[key] || 0;
      const product = products.find((item) => String(item.id) === String(productId));
      const minimumQuantity = product?.min_order_qty || 1;
      if (currentQuantity <= minimumQuantity) {
        return Object.fromEntries(Object.entries(currentItems).filter(([itemKey]) => itemKey !== key));
      }
      return { ...currentItems, [key]: currentQuantity - 1 };
    });
  }, [products]);

  const removeLineFromCart = useCallback((productId: string | number, volume: string | number) => {
    const key = `${productId}-${volume}`;
    setCartItems((currentItems) => Object.fromEntries(Object.entries(currentItems).filter(([itemKey]) => itemKey !== key)));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems({});

    if (!user) return;
    try {
      localStorage.setItem(`cart:${user.id}`, '{}');
    } catch (error) {
      console.error('Error clearing local cart:', error);
    }

    void supabase.from('customer_carts').upsert({
      user_id: user.id,
      items: {},
      updated_at: new Date().toISOString()
    }).then(({ error }) => {
      if (error) console.error('Error clearing server cart:', error);
    });
  }, [user]);

  const requestCartImport = useCallback((items: CartItems, sourceLabel: string) => {
    const sanitizedItems = sanitizeCart(items);
    if (Object.keys(sanitizedItems).length === 0) return Promise.resolve<CartImportResult>('cancelled');
    if (Object.keys(cartItems).length === 0) {
      setCartItems(sanitizedItems);
      return Promise.resolve<CartImportResult>('replaced');
    }
    return new Promise<CartImportResult>((resolve) => setPendingImport({ items: sanitizedItems, sourceLabel, resolve }));
  }, [cartItems]);

  const finishImport = (result: CartImportResult) => {
    if (!pendingImport) return;
    if (result === 'replaced') setCartItems(pendingImport.items);
    if (result === 'merged') {
      setCartItems((current) => {
        const merged = { ...current };
        Object.entries(pendingImport.items).forEach(([key, quantity]) => { merged[key] = (merged[key] || 0) + quantity; });
        return merged;
      });
    }
    pendingImport.resolve(result);
    setPendingImport(null);
  };

  return (
    <CartContext.Provider value={{ cartItems, products, setProducts, totalVolume, isCartHydrated, addToCart, removeFromCart, removeLineFromCart, clearCart, requestCartImport }}>
      {children}
      {pendingImport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="cart-import-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="cart-import-title" className="text-xl font-bold text-slate-950">V košíku už máte položky</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Chcete položky ze zdroje „{pendingImport.sourceLabel}“ přidat k současnému košíku, nebo současný košík nahradit?</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => finishImport('merged')} className="min-h-11 rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800">Přidat ke košíku</button>
              <button type="button" onClick={() => finishImport('replaced')} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-800 hover:bg-slate-50">Nahradit košík</button>
            </div>
            <button type="button" onClick={() => finishImport('cancelled')} className="mt-2 min-h-10 w-full rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Zrušit</button>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
