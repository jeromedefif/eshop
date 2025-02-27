'use client'

import { createContext, useContext, useState, useEffect } from 'react';
import type { Product } from '@/types/database';
import { useAuth } from './AuthContext';

// Zjednodušený typ pro položku košíku
export interface CartItem {
  productId: number;
  volume: string | number;
  quantity: number;
}

type CartContextType = {
  items: CartItem[];
  addItem: (productId: number, volume: string | number) => void;
  removeItem: (productId: number, volume: string | number) => void;
  clearCart: () => void;
  reinitializeCart: () => void; // Nová metoda pro reinicializaci košíku
  totalVolume: number;
  getProductsNeeded: () => number[];
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [totalVolume, setTotalVolume] = useState(0);
  const { user } = useAuth();
  
  // Helper pro načtení košíku podle klíče
  const loadCartFromStorage = (storageKey: string) => {
    try {
      const savedCart = localStorage.getItem(storageKey);
      if (savedCart) {
        return JSON.parse(savedCart);
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
    }
    return null;
  };

  // Načtení košíku z localStorage s ohledem na přihlášeného uživatele
  useEffect(() => {
    console.log('Cart Context: Uživatelský stav se změnil, aktualizuji košík', user?.id);
    
    try {
      // Použít různé klíče pro přihlášené a nepřihlášené uživatele
      const currentStorageKey = user ? `cart-${user.id}` : 'cart-guest';
      
      // 1. Zkusit načíst košík pro aktuální stav autentizace
      const currentCart = loadCartFromStorage(currentStorageKey);
      
      if (currentCart) {
        // Pokud existuje košík pro aktuální stav, použij ho
        console.log('Cart Context: Nalezen košík pro aktuální stav uživatele');
        setItems(currentCart);
      } else if (user) {
        // Pokud jsme se právě přihlásili a nemáme košík uživatele, 
        // zkusme přenést košík hosta (pokud existuje)
        const guestCart = loadCartFromStorage('cart-guest');
        if (guestCart && guestCart.length > 0) {
          console.log('Cart Context: Přenáším košík hosta k přihlášenému uživateli');
          setItems(guestCart);
          
          // Uložíme přenesený košík hosta do uživatelského košíku
          localStorage.setItem(currentStorageKey, JSON.stringify(guestCart));
          
          // Vyčistíme košík hosta po přenesení
          localStorage.removeItem('cart-guest');
        } else {
          console.log('Cart Context: Žádný košík k přenesení, začínám s prázdným košíkem');
        }
      } else {
        // Jsme nepřihlášení a nemáme košík hosta - začínáme s prázdným košíkem
        console.log('Cart Context: Začínám s prázdným košíkem pro hosta');
        setItems([]);
      }
    } catch (error) {
      console.error('Error handling cart during auth change:', error);
      setItems([]);
    }
  }, [user?.id]); // Přenačíst při změně ID přihlášeného uživatele

  // Uložení košíku do localStorage při změně s ohledem na přihlášeného uživatele
  useEffect(() => {
    try {
      const storageKey = user ? `cart-${user.id}` : 'cart-guest';
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [items, user?.id]);

  // Výpočet celkového objemu
  useEffect(() => {
    const volume = items.reduce((total, item) => {
      if (
        item.volume === 'maly' || 
        item.volume === 'velky' || 
        item.volume === 'baleni'
      ) {
        return total;
      }
      return total + (Number(item.volume) * item.quantity);
    }, 0);
    
    setTotalVolume(volume);
  }, [items]);

  const findItemIndex = (productId: number, volume: string | number) => {
    return items.findIndex(
      item => item.productId === productId && item.volume === volume
    );
  };

  const addItem = (productId: number, volume: string | number) => {
    setItems(prev => {
      const existingIndex = findItemIndex(productId, volume);
      
      if (existingIndex >= 0) {
        // Existující položka - zvyšujeme počet
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        };
        return updated;
      } else {
        // Nová položka
        return [...prev, { productId, volume, quantity: 1 }];
      }
    });
  };

  const removeItem = (productId: number, volume: string | number) => {
    setItems(prev => {
      const existingIndex = findItemIndex(productId, volume);
      
      if (existingIndex === -1) return prev;
      
      const item = prev[existingIndex];
      
      if (item.quantity > 1) {
        // Snížit množství
        const updated = [...prev];
        updated[existingIndex] = {
          ...item,
          quantity: item.quantity - 1
        };
        return updated;
      } else {
        // Odstranit položku úplně
        return prev.filter((_, index) => index !== existingIndex);
      }
    });
  };

  const clearCart = () => {
    setItems([]);
    // Vyčistit i v localStorage při explicitním vyčištění košíku
    try {
      const storageKey = user ? `cart-${user.id}` : 'cart-guest';
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Error clearing cart from localStorage:', error);
    }
  };

  // Pomocná metoda pro reinicializaci košíku - užitečné při problémech s aplikací
  const reinitializeCart = () => {
    console.log('Cart Context: Reinicializace košíku');
    try {
      // Kompletní vyčištění a znovunačtení košíku
      setItems([]);
      const storageKey = user ? `cart-${user.id}` : 'cart-guest';
      const savedCart = localStorage.getItem(storageKey);
      
      if (savedCart) {
        console.log('Cart Context: Znovu načítám uložený košík');
        setItems(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error('Error reinitializing cart:', error);
    }
  };

  // Helper metoda pro získání seznamu ID produktů v košíku
  const getProductsNeeded = () => {
    return [...new Set(items.map(item => item.productId))];
  };

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      clearCart,
      reinitializeCart,
      totalVolume,
      getProductsNeeded
    }}>
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