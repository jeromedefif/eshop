'use client';

import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CartContext } from '../page';
import OrderForm from '@/components/OrderForm';
import Header from '@/components/Header';
import Link from 'next/link';
import { ShoppingBag, ArrowLeft } from 'lucide-react';

const OrderSummaryPage = () => {
    const router = useRouter();
    const { user, profile } = useAuth();
    const cartContext = useContext(CartContext);

    if (!cartContext) {
        return null;
    }

    const {
        cartItems,
        setCartItems,
        products,
        totalVolume
    } = cartContext;

    // Odstraněno přesměrování - místo toho budeme zobrazovat prázdný stav košíku

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
        setCartItems({});
    };

    // Obsah pro prázdný košík
    const EmptyCartContent = () => (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Souhrn objednávky
            </h1>

            <div className="bg-white rounded-lg shadow p-8 text-center">
                <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Váš košík je prázdný</h2>
                <p className="text-gray-600 mb-6">
                    Pro vytvoření objednávky nejprve přidejte produkty do košíku.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg
                             hover:bg-blue-700 transition-colors"
                >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Zpět do katalogu
                </Link>
            </div>
        </div>
    );

    return (
        <>
          <div className="min-h-screen bg-gray-50">
                <div className="sticky top-0 z-50">
                    <Header
                        cartItems={cartItems}
                        products={products}
                        totalVolume={totalVolume}
                        onRemoveFromCart={handleRemoveFromCart}
                        onClearCart={handleClearCart}
                    />
                </div>

                <main className="container mx-auto px-4 py-6 notranslate">
                    {Object.keys(cartItems).length === 0 ? (
                        <EmptyCartContent />
                    ) : (
                        <div className="max-w-4xl mx-auto">
                            <h1
                                className="text-2xl font-bold text-gray-900 mb-6"
                                lang="cs-CZ"
                                translate="no"
                            >
                                Souhrn objednávky
                            </h1>

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
                        </div>
                    )}
                </main>
            </div>
        </>
    );
};

export default OrderSummaryPage;
