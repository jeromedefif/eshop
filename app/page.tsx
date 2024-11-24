'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Header from './components/Header';
import ProductList from './components/ProductList';
import OrderForm from './components/OrderForm';
import AdminProducts from './components/AdminProducts';
import LoginDialog from './components/LoginDialog';

// Inicializace Supabase klienta
const supabase = createClient(
  'https://uhawlwolmyoqcdurhuel.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoYXdsd29sbXlvcWNkdXJodWVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIyNzgxMDUsImV4cCI6MjA0Nzg1NDEwNX0.2o5fFfo1q3xMKjD7QfFNYcsWb8zv5peWsbFLtnJQF4Y'
);

interface Product {
  id: number;
  name: string;
  category: string;
  in_stock: boolean;
  created_at?: string;
}

// Definujeme výchozí hodnoty pro cart
const defaultCartItems: {[key: string]: number} = {};

export default function Home() {
  // Inicializujeme všechny stavy s výchozími hodnotami
  const [currentView, setCurrentView] = useState<'catalog' | 'order' | 'admin'>('catalog');
  const [cartItems, setCartItems] = useState<{[key: string]: number}>(defaultCartItems);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Načtení produktů
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

  // Načtení dat při prvním renderu
  useEffect(() => {
    loadProducts();
  }, []);

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

  // Ukládání košíku do localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [cartItems]);

  const getCartItemsCount = () => {
    return Object.values(cartItems).reduce((sum, count) => sum + count, 0);
  };

  const handleViewChange = (view: 'catalog' | 'order' | 'admin') => {
    if (view === 'admin' && !isAuthenticated) {
      setIsLoginDialogOpen(true);
    } else {
      setCurrentView(view);
    }
  };

  const handleLogin = (password: string) => {
    if (password === 'jeromedefif') {
      setIsAuthenticated(true);
      setIsLoginDialogOpen(false);
      setCurrentView('admin');
    }
  };

  const handleAddToCart = (productId: number, volume: number) => {
    setCartItems(prev => {
      const key = `${productId}-${volume}`;
      return {
        ...prev,
        [key]: (prev[key] || 0) + 1
      };
    });
  };

  const handleRemoveFromCart = (productId: number, volume: number) => {
    setCartItems(prev => {
      const key = `${productId}-${volume}`;
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleClearCart = () => {
    setCartItems(defaultCartItems);
  };

  const getTotalVolume = () => {
    return Object.entries(cartItems).reduce((total, [key, count]) => {
      const volume = parseInt(key.split('-')[1]);
      return total + (volume * count);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-50">
        <Header
          cartItems={cartItems}
          products={products}
          onViewChange={handleViewChange}
          currentView={currentView}
          totalVolume={getTotalVolume()}
          onRemoveFromCart={handleRemoveFromCart}
          onClearCart={handleClearCart}
        />
      </div>

      <main className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {currentView === 'catalog' && (
              <ProductList
                onAddToCart={handleAddToCart}
                cartItems={cartItems}
                products={products}
              />
            )}
            {currentView === 'order' && (
              <OrderForm
                cartItems={cartItems}
                products={products}
                onRemoveFromCart={handleRemoveFromCart}
                onClearCart={handleClearCart}
                totalVolume={getTotalVolume()}
              />
            )}
            {currentView === 'admin' && isAuthenticated && (
              <AdminProducts
                products={products}
                onProductsChange={loadProducts}
                onAddProduct={async (product) => {
                  const { error } = await supabase
                    .from('products')
                    .insert([{ 
                      name: product.name,
                      category: product.category,
                      in_stock: product.inStock
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
                      in_stock: product.inStock
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
          </>
        )}
      </main>

      <LoginDialog
        isOpen={isLoginDialogOpen}
        onClose={() => setIsLoginDialogOpen(false)}
        onLogin={handleLogin}
      />
    </div>
  );
}