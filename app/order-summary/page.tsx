'use client';

import { useContext, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CartContext } from '@/contexts/CartContext';
import OrderForm from '@/components/OrderForm';
import Link from 'next/link';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import CustomerPageShell from '@/components/CustomerPageShell';
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from '@/lib/analytics/client';

const OrderSummaryPage = () => {
    const { user, profile } = useAuth();
    const cartContext = useContext(CartContext);

    useEffect(() => {
        if (!cartContext?.isCartHydrated || Object.keys(cartContext.cartItems).length === 0) return;
        trackAnalyticsEvent(ANALYTICS_EVENTS.orderSummaryOpened, {
            itemCount: Object.values(cartContext.cartItems).reduce((sum, quantity) => sum + quantity, 0),
            oncePerJourney: true,
        });
    }, [cartContext]);

    if (!cartContext) {
        return null;
    }

    const {
        cartItems,
        products,
        totalVolume,
        addToCart,
        removeFromCart,
        clearCart
    } = cartContext;

    // Odstraněno přesměrování - místo toho budeme zobrazovat prázdný stav košíku

    // Obsah pro prázdný košík
    const EmptyCartContent = () => (
        <div>
            <h1 className="mb-6 text-3xl font-bold tracking-tight text-slate-950">
                Souhrn objednávky
            </h1>

            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                    <ShoppingBag className="h-8 w-8 text-slate-500" />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-slate-900">Váš košík je prázdný</h2>
                <p className="mb-6 text-slate-600">
                    Pro vytvoření objednávky nejprve přidejte produkty do košíku.
                </p>
                <Link
                    href="/"
                    className="inline-flex min-h-11 items-center rounded-xl bg-blue-700 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-blue-800"
                >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Zpět do katalogu
                </Link>
            </div>
        </div>
    );

    return (
        <CustomerPageShell width="5xl" mainClassName="notranslate">
                    {Object.keys(cartItems).length === 0 ? (
                        <EmptyCartContent />
                    ) : (
                        <div>
                            <h1
                                className="mb-6 text-3xl font-bold tracking-tight text-slate-950"
                                lang="cs-CZ"
                                translate="no"
                            >
                                Souhrn objednávky
                            </h1>

                            <OrderForm
                                cartItems={cartItems}
                                products={products}
                                onRemoveFromCart={removeFromCart}
                                onAddToCart={addToCart}
                                onClearCart={clearCart}
                                totalVolume={totalVolume}
                                user={user}
                                profile={profile}
                            />
                        </div>
                    )}
        </CustomerPageShell>
    );
};

export default OrderSummaryPage;
