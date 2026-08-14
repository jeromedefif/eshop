'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FileText,
  List,
  LogOut,
  Menu,
  Package,
  RotateCcw,
  ShoppingCart,
  User,
  UserCog,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useQuickReorder } from '@/hooks/useQuickReorder';
import Cart from './Cart';

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isQuickReordering, setIsQuickReordering] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const { cartItems, products, totalVolume, removeFromCart, clearCart } = useCart();
  const quickReorder = useQuickReorder();

  const cartItemsCount = Object.values(cartItems).reduce((sum, count) => sum + count, 0);
  const displayName = profile?.full_name || user?.email || 'Můj účet';

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/order-summary') {
      return pathname === '/order-summary' || pathname === '/order-confirmation';
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const desktopLinkClass = (href: string) =>
    `inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
      isActive(href)
        ? 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-100'
        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
    }`;

  const mobileLinkClass = (href: string) =>
    `flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold transition ${
      isActive(href)
        ? 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-100'
        : 'text-slate-800 hover:bg-slate-100'
    }`;

  const closeMobileMenu = () => setMobileMenuOpen(false);

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

  const handleQuickReorder = async () => {
    if (isQuickReordering) return;
    setIsQuickReordering(true);
    try {
      await quickReorder();
    } finally {
      setIsQuickReordering(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex min-h-[72px] items-center gap-3">
            <Link href="/" className="group shrink-0" aria-label="VINARIA s.r.o. – objednávkový katalog">
              <span className="block text-lg font-bold leading-tight tracking-tight text-slate-950 transition group-hover:text-blue-800 sm:text-xl">
                VINARIA s.r.o.
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700 sm:text-xs">
                Beginy.cz
              </span>
            </Link>

            <nav aria-label="Hlavní navigace" className="ml-5 hidden items-center gap-1 lg:flex">
              <Link href="/" className={desktopLinkClass('/')} aria-current={isActive('/') ? 'page' : undefined}>
                <List className="h-4 w-4" />
                Katalog
              </Link>
              <Link
                href="/order-summary"
                className={desktopLinkClass('/order-summary')}
                aria-current={isActive('/order-summary') ? 'page' : undefined}
              >
                <FileText className="h-4 w-4" />
                Souhrn objednávky
              </Link>
            </nav>

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              {user && (
                <button
                  onClick={handleQuickReorder}
                  disabled={isQuickReordering}
                  className="hidden min-h-11 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 xl:inline-flex"
                >
                  <RotateCcw className={`h-4 w-4 ${isQuickReordering ? 'animate-spin' : ''}`} />
                  {isQuickReordering ? 'Načítám...' : 'Objednat poslední'}
                </button>
              )}

              {user && (
                <Link href="/my-orders" className={`${desktopLinkClass('/my-orders')} hidden xl:inline-flex`}>
                  <Package className="h-4 w-4" />
                  Moje objednávky
                </Link>
              )}

              {profile?.is_admin && (
                <Link href="/admin/orders" className={`${desktopLinkClass('/admin')} hidden lg:inline-flex`}>
                  <UserCog className="h-4 w-4" />
                  <span className="hidden 2xl:inline">Administrace</span>
                </Link>
              )}

              {user ? (
                <div className="group relative hidden lg:block">
                  <button
                    type="button"
                    className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      isActive('/my-profile')
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                    aria-label="Otevřít nabídku uživatelského účtu"
                  >
                    <User className="h-5 w-5" />
                    <span className="hidden max-w-36 truncate 2xl:inline">{displayName}</span>
                  </button>

                  <div className="invisible absolute right-0 top-full z-[60] w-56 translate-y-1 pt-2 opacity-0 transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                      <div className="border-b border-slate-100 px-3 py-2 2xl:hidden">
                        <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                      </div>
                      <Link href="/my-profile" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
                        <User className="h-4 w-4" />
                        Můj profil
                      </Link>
                      <button
                        onClick={handleQuickReorder}
                        disabled={isQuickReordering}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-blue-800 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 xl:hidden"
                      >
                        <RotateCcw className={`h-4 w-4 ${isQuickReordering ? 'animate-spin' : ''}`} />
                        {isQuickReordering ? 'Načítám...' : 'Objednat poslední'}
                      </button>
                      <Link href="/my-orders" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 xl:hidden">
                        <Package className="h-4 w-4" />
                        Moje objednávky
                      </Link>
                      <button
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <LogOut className="h-4 w-4" />
                        {isSigningOut ? 'Odhlašuji...' : 'Odhlásit'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link href="/login" className={`${desktopLinkClass('/login')} hidden lg:inline-flex`}>
                  <User className="h-5 w-5" />
                  Přihlásit
                </Link>
              )}

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-900 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label={`Otevřít košík, ${cartItemsCount} položek`}
              >
                {cartItemsCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-blue-700 px-1 text-[11px] font-bold text-white ring-2 ring-white">
                    {cartItemsCount > 99 ? '99+' : cartItemsCount}
                  </span>
                )}
                <ShoppingCart className="h-6 w-6" />
              </button>

              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-800 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 lg:hidden"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-customer-navigation"
                aria-label={mobileMenuOpen ? 'Zavřít navigaci' : 'Otevřít navigaci'}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div id="mobile-customer-navigation" className="border-t border-slate-200 bg-white lg:hidden">
            <nav aria-label="Mobilní navigace" className="mx-auto max-w-7xl space-y-1 px-4 py-4 sm:px-6">
              {user && (
                <div className="mb-3 rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Přihlášený uživatel</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-900">{displayName}</p>
                </div>
              )}

              <Link href="/" className={mobileLinkClass('/')} onClick={closeMobileMenu}>
                <List className="h-5 w-5" />
                Katalog produktů
              </Link>
              <Link href="/order-summary" className={mobileLinkClass('/order-summary')} onClick={closeMobileMenu}>
                <FileText className="h-5 w-5" />
                Souhrn objednávky
              </Link>

              {user ? (
                <>
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      void handleQuickReorder();
                    }}
                    disabled={isQuickReordering}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-blue-700 px-4 py-3 text-left text-base font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RotateCcw className={`h-5 w-5 ${isQuickReordering ? 'animate-spin' : ''}`} />
                    {isQuickReordering ? 'Načítám...' : 'Objednat poslední'}
                  </button>
                  <Link href="/my-orders" className={mobileLinkClass('/my-orders')} onClick={closeMobileMenu}>
                    <Package className="h-5 w-5" />
                    Moje objednávky
                  </Link>
                  <Link href="/my-profile" className={mobileLinkClass('/my-profile')} onClick={closeMobileMenu}>
                    <User className="h-5 w-5" />
                    Můj profil
                  </Link>
                  {profile?.is_admin && (
                    <Link href="/admin/orders" className={mobileLinkClass('/admin')} onClick={closeMobileMenu}>
                      <UserCog className="h-5 w-5" />
                      Administrace
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      void handleSignOut();
                    }}
                    disabled={isSigningOut}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-base font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LogOut className="h-5 w-5" />
                    {isSigningOut ? 'Odhlašuji...' : 'Odhlásit'}
                  </button>
                </>
              ) : (
                <Link href="/login" className={mobileLinkClass('/login')} onClick={closeMobileMenu}>
                  <User className="h-5 w-5" />
                  Přihlásit
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        products={products}
        onRemoveFromCart={removeFromCart}
        onClearCart={clearCart}
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
