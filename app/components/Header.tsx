'use client';

import React, { useState } from 'react';
import { ShoppingCart, List, Settings, User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Cart from './Cart';
import AuthDialog from './AuthDialog';
import RegistrationDialog from './RegistrationDialog';
import { Product } from '@/types/database';  // Přidáme import typu Product

type HeaderProps = {
    cartItems: {[key: string]: number};
    products: Product[];  // Použijeme importovaný typ Product
    onViewChange: (view: 'catalog' | 'order' | 'admin') => void;
    currentView: 'catalog' | 'order' | 'admin';
    totalVolume: number;
    onRemoveFromCart: (productId: number, volume: string | number) => void;
    onClearCart: () => void;
};

const Header = ({
    cartItems,
    products,
    onViewChange,
    currentView,
    totalVolume,
    onRemoveFromCart,
    onClearCart
}: HeaderProps) => {
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
    const [isRegistrationDialogOpen, setIsRegistrationDialogOpen] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const { user, profile, signOut } = useAuth();

    const cartItemsCount = Object.values(cartItems).reduce((sum, count) => sum + count, 0);

    const handleSignOut = async () => {
        if (isSigningOut) return; // Prevent multiple clicks

        setIsSigningOut(true);
        try {
            await signOut();
            if (currentView === 'admin') {
                onViewChange('catalog');
            }
        } catch (error) {
            console.error('Error signing out:', error);
            // Optionally show error message to user
        } finally {
            setIsSigningOut(false);
        }
    };

    return (
        <>
            <header className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-lg font-bold text-gray-900">VINARIA s.r.o.</h1>
                            <nav className="hidden md:ml-6 md:flex md:space-x-4">
                                <button
                                    onClick={() => onViewChange('catalog')}
                                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                                        currentView === 'catalog'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-900 hover:bg-gray-100'
                                    }`}
                                >
                                    <List className="mr-1.5 h-5 w-5" />
                                    Katalog produktů
                                </button>
                                <button
                                    onClick={() => onViewChange('order')}
                                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                                        currentView === 'order'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-900 hover:bg-gray-100'
                                    }`}
                                >
                                    Souhrn objednávky
                                </button>
                            </nav>
                        </div>

                        <div className="flex items-center space-x-4">
                            {profile?.is_admin && (
                                <button
                                    onClick={() => onViewChange('admin')}
                                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                                        currentView === 'admin'
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-900 hover:bg-gray-100'
                                    }`}
                                >
                                    <Settings className="mr-1.5 h-5 w-5" />
                                    Správa
                                </button>
                            )}

                            {user ? (
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <User className="h-5 w-5 text-gray-600" />
                                        <span className="text-sm font-medium text-gray-700">
                                            {profile?.full_name || user.email}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleSignOut}
                                        disabled={isSigningOut}
                                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700
                                                 hover:bg-gray-100 rounded-md disabled:opacity-50
                                                 disabled:cursor-not-allowed transition-all duration-200"
                                    >
                                        <LogOut className="h-5 w-5 mr-1.5" />
                                        {isSigningOut ? 'Odhlašuji...' : 'Odhlásit'}
                                    </button>
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

            <Cart
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                cartItems={cartItems}
                products={products}
                onRemoveFromCart={onRemoveFromCart}
                onClearCart={onClearCart}
                onGoToOrder={() => {
                    setIsCartOpen(false);
                    onViewChange('order');
                }}
                totalVolume={totalVolume}
            />
        </>
    );
};

export default Header;
