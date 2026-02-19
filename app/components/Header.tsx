'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { List, UserCog, LogOut, ShoppingCart, Package, User, FileText, RotateCcw, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Cart from './Cart';
import { Product } from '@/types/database';

type HeaderProps = {
   cartItems: {[key: string]: number};
   products: Product[];
   totalVolume: number;
   onRemoveFromCart: (productId: number, volume: string | number) => void;
   onClearCart: () => void;
   onQuickReorder?: () => Promise<void>;
};

const Header = ({
   cartItems,
   products,
   totalVolume,
   onRemoveFromCart,
   onClearCart,
   onQuickReorder
}: HeaderProps) => {
   const router = useRouter();
   const pathname = usePathname();
   const [isCartOpen, setIsCartOpen] = useState(false);
   const [isSigningOut, setIsSigningOut] = useState(false);
   const [isQuickReordering, setIsQuickReordering] = useState(false);
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
   const { user, profile, signOut } = useAuth();

   const cartItemsCount = Object.values(cartItems).reduce((sum, count) => sum + count, 0);

   const handleSignOut = async () => {
       if (isSigningOut) return;

       setIsSigningOut(true);
       try {
           await signOut();
       } catch (error) {
           console.error('Error signing out:', error);
       } finally {
           setIsSigningOut(false);
       }
   };

   const handleMobileMenuToggle = () => {
       setMobileMenuOpen(!mobileMenuOpen);
   };

   const handleQuickReorder = async () => {
      if (!onQuickReorder || isQuickReordering) return;
      setIsQuickReordering(true);
      try {
        await onQuickReorder();
      } finally {
        setIsQuickReordering(false);
      }
   };

   return (
    <>
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="text-lg font-bold text-gray-900">
                VINARIA s.r.o.
              </Link>
            </div>

            {/* Navigace - zobrazená na větších zařízeních */}
            <nav className="hidden md:ml-6 md:flex md:space-x-4">
              <Link
                href="/"
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  pathname === '/'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <List className="mr-1.5 h-5 w-5" />
                Katalog produktů
              </Link>
              <Link
                href="/order-summary"
                className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  pathname === '/order-summary'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FileText className="mr-1.5 h-5 w-5" />
                Souhrn objednávky
              </Link>
            </nav>

            {/* Hamburger menu tlačítko - zobrazeno jen na mobilech */}
            <button
              className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
              onClick={handleMobileMenuToggle}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>

            {/* Pravá část s profilem a košíkem */}
            <div className="flex items-center space-x-4">
              {user && (
                <div className="hidden md:flex items-center space-x-2">
                  <button
                    onClick={handleQuickReorder}
                    disabled={!onQuickReorder || isQuickReordering}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCcw className="mr-1.5 h-4 w-4" />
                    {isQuickReordering ? 'Načítám...' : 'Objednat poslední'}
                  </button>
                  <Link
                    href="/my-orders"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-900 hover:bg-gray-100"
                  >
                    Moje objednávky
                  </Link>
                </div>
              )}

              {profile?.is_admin && (
                <Link
                href="/admin/orders"  // První se zobrazí objednávky Změna zde!
                  className="hidden md:inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-900 hover:bg-gray-100"
                >
                  <UserCog className="mr-1.5 h-5 w-5" />
                  <span className="hidden lg:inline">Administrace</span>
                </Link>
              )}

              {user ? (
                <div className="flex items-center space-x-4">
                  <div className="relative group">
                    <button
                      className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                    >
                      <User className="h-5 w-5 text-gray-600 md:mr-1" />
                      <span className="hidden md:inline">{profile?.full_name || user.email}</span>
                    </button>

                    {/* Dropdown menu */}
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg overflow-hidden z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <Link
                        href="/my-profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Můj profil
                      </Link>

                      <Link
                        href="/my-orders"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Moje objednávky
                      </Link>

                      <button
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {isSigningOut ? 'Odhlašuji...' : 'Odhlásit'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    href="/login"
                    className="md:px-4 md:py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md flex items-center"
                  >
                    <User className="h-5 w-5 md:mr-1" />
                    <span className="hidden md:inline">Přihlásit</span>
                  </Link>
                </div>
              )}

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs
                                 rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
                <ShoppingCart className="h-6 w-6 text-gray-900" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobilní menu - zobrazí se jen na mobilech když je otevřeno */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 py-2">
            <div className="px-4 pt-2 pb-3 space-y-1">
              <Link
                href="/"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname === '/'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <List className="inline-block mr-2 h-5 w-5" />
                Katalog produktů
              </Link>
              <Link
                href="/order-summary"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname === '/order-summary'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <FileText className="inline-block mr-2 h-5 w-5" />
                Souhrn objednávky
              </Link>
              {user && (
                <>
                  <button
                    onClick={() => {
                      void handleQuickReorder();
                      setMobileMenuOpen(false);
                    }}
                    disabled={!onQuickReorder || isQuickReordering}
                    className={`block w-full px-3 py-2 rounded-md text-base font-medium text-left ${
                      !onQuickReorder || isQuickReordering
                        ? 'bg-blue-50 text-blue-700 opacity-70 cursor-not-allowed'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    <RotateCcw className="inline-block mr-2 h-5 w-5" />
                    {isQuickReordering ? 'Načítám...' : 'Objednat poslední'}
                  </button>
                  <Link
                    href="/my-orders"
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      pathname === '/my-orders'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-900 hover:bg-gray-100'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Package className="inline-block mr-2 h-5 w-5" />
                    Moje objednávky
                  </Link>
                </>
              )}
              {profile?.is_admin && (
                <Link
                  href="/admin/products"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <UserCog className="inline-block mr-2 h-5 w-5" />
                  Administrace
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        products={products}
        onRemoveFromCart={onRemoveFromCart}
        onClearCart={onClearCart}
        onGoToOrder={() => {
          setIsCartOpen(false);
          router.push('/order-summary');
        }}
        totalVolume={totalVolume}
      />
    </>
   );
};

export default Header;
