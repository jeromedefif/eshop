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
  isProductsLoading: boolean;
  productsError: string | null;
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
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [totalVolume, setTotalVolume] = useState(0);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const activeStorageKeyRef = useRef('cart');
  const hydrationIdRef = useRef(0);
  const cartRevision = useRef(0);
  const remoteReady = useRef(false);
  const hydratedOwner = useRef<string | null | undefined>(undefined);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const [cartSyncError, setCartSyncError] = useState<string | null>(null);
  const [reloadCart, setReloadCart] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      try {
        setProductsError(null);
        const { data, error } = await supabase
          .from('products').select('*').eq('is_archived', false)
          .order('is_new', { ascending: false }).order('is_featured', { ascending: false })
          .order('sort_priority', { ascending: false }).order('name');
        if (error) throw error;
        if (isMounted) setProducts(sortCatalogProducts(data || []));
      } catch (error) {
        console.error('Error loading products in CartProvider:', error);
        if (isMounted) setProductsError('Katalog se nepodařilo obnovit. Zkuste stránku načíst znovu.');
      } finally {
        if (isMounted) setIsProductsLoading(false);
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
      remoteReady.current = false;
      setCartSyncError(null);
      if (userId) {
        try {
          const response = await fetch('/api/cart', { cache: 'no-store' });
          if (!response.ok) throw new Error();
          const data = await response.json();
          if (hydrationId !== hydrationIdRef.current) return;
          cartRevision.current = data.revision;
          if (data.exists) nextCart = sanitizeCart(data.items);
          else if (!Object.keys(nextCart).length) nextCart = readStoredCart('cart');
          remoteReady.current = true;
        } catch {
          if (hydrationId === hydrationIdRef.current) setCartSyncError('Košík je uložen jen v tomto prohlížeči. Spojení se serverem se nepodařilo obnovit.');
        }
      }
      if (hydrationId !== hydrationIdRef.current) return;
      hydratedOwner.current = userId;
      setCartItems(nextCart);
      setIsCartHydrated(true);
    };
    void hydrateCart();
  }, [user?.id, reloadCart]);

  useEffect(() => {
    if (!isCartHydrated || hydratedOwner.current !== (user?.id || null)) return;
    try {
      localStorage.setItem(activeStorageKeyRef.current, JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [cartItems, isCartHydrated, user?.id]);

  useEffect(() => {
    if (!isCartHydrated || !user || hydratedOwner.current !== user.id || !remoteReady.current) return;
    const generation = hydrationIdRef.current;
    const userId = user.id;
    const timer = window.setTimeout(() => {
      saveChain.current = saveChain.current.catch(() => {}).then(async () => {
        if (generation !== hydrationIdRef.current || !remoteReady.current) return;
        try {
          const response = await fetch('/api/cart', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, items: cartItems, revision: cartRevision.current }) });
          const result = await response.json();
          if (generation !== hydrationIdRef.current) return;
          if (!response.ok) throw new Error(result.error || 'Košík se nepodařilo synchronizovat.');
          cartRevision.current = result.revision;
          localStorage.removeItem('cart');
        } catch (error) {
          if (generation !== hydrationIdRef.current) return;
          remoteReady.current = false;
          try { localStorage.setItem(`cart:unsynced:${userId}`, JSON.stringify(cartItems)); } catch { /* Keep the in-memory cart and show the sync error. */ }
          setCartSyncError(error instanceof Error ? error.message : 'Košík se nepodařilo synchronizovat.');
        }
      });
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
        void trackAnalyticsEvent(ANALYTICS_EVENTS.firstItemAdded, {
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
    // The revision-checked effect serializes this write behind in-flight saves.
  }, []);

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
    <CartContext.Provider value={{ cartItems, products, isProductsLoading, productsError, setProducts, totalVolume, isCartHydrated, addToCart, removeFromCart, removeLineFromCart, clearCart, requestCartImport }}>
      {cartSyncError && <div role="alert" className="border-b border-amber-300 bg-amber-50 p-3 text-center text-sm text-amber-950">
        {cartSyncError} Záloha místních položek zůstává v prohlížeči.
        <button className="ml-3 font-semibold underline" onClick={() => { if (user) localStorage.setItem(`cart:unsynced:${user.id}`, JSON.stringify(cartItems)); setReloadCart(n => n + 1); }}>Načíst společný košík</button>
      </div>}
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
