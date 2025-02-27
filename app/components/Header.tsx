'use client';

import React, { useState, lazy, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { List, Settings, UserCog, LogOut, ShoppingCart, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Cart from './Cart';
import AuthDialog from './AuthDialog';
import RegistrationDialog from './RegistrationDialog';
import { Product } from '@/types/database';

// Lazy load ProfileDialog - klíčová změna
const ProfileDialog = lazy(() => import('./ProfileDialog'));

type HeaderProps = {
   cartItems: {[key: string]: number};
   products: Product[];
   totalVolume: number;
   onRemoveFromCart: (productId: number, volume: string | number) => void;
   onClearCart: () => void;
};

const Header = ({
   cartItems,
   products,
   totalVolume,
   onRemoveFromCart,
   onClearCart
}: HeaderProps) => {
   const router = useRouter();
   const pathname = usePathname();
   const [isCartOpen, setIsCartOpen] = useState(false);
   const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
   const [isRegistrationDialogOpen, setIsRegistrationDialogOpen] = useState(false);
   const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
   const [isSigningOut, setIsSigningOut] = useState(false);
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

   const handleProfileClick = () => {
       setIsProfileDialogOpen(true);
   };

   return (
    <>
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-lg font-bold text-gray-900">
                VINARIA s.r.o.
              </Link>
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
                  Souhrn objednávky
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              {profile?.is_admin && (
                <Link
                  href="/admin/products"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-900 hover:bg-gray-100"
                >
                  <Settings className="mr-1.5 h-5 w-5" />
                  Administrace
                </Link>
              )}

              {user ? (
                <div className="flex items-center space-x-4">
                  <div className="relative group">
                    <button
                      onClick={handleProfileClick}
                      className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                    >
                      <UserCog className="h-5 w-5 text-gray-600" />
                      <span>{profile?.full_name || user.email}</span>
                    </button>

                    {/* Dropdown menu */}
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg overflow-hidden z-20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
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
                  <button
                    onClick={() => setIsAuthDialogOpen(true)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    Přihlásit
                  </button>
                  <button
                    onClick={() => setIsRegistrationDialogOpen(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600
                             hover:bg-blue-700 rounded-md transition-colors"
                  >
                    Registrace
                  </button>
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
      </header>

      <AuthDialog
        isOpen={isAuthDialogOpen}
        onClose={() => setIsAuthDialogOpen(false)}
      />

      <RegistrationDialog
        isOpen={isRegistrationDialogOpen}
        onClose={() => setIsRegistrationDialogOpen(false)}
      />

      {/* Upravené renderování ProfileDialog - pouze když je otevřený */}
      {isProfileDialogOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-[100]">
            <div className="bg-white p-4 rounded-lg">Načítání...</div>
          </div>
        }>
          <ProfileDialog
            isOpen={isProfileDialogOpen}
            onClose={() => setIsProfileDialogOpen(false)}
          />
        </Suspense>
      )}

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
