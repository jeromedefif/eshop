'use client';

import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CartContext } from '../page';
import OrderForm from '@/components/OrderForm';
import Header from '@/components/Header';
import Script from 'next/script';

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

    // Zajištění správného nastavení jazyka při každém vykreslení komponenty
    useEffect(() => {
        // Explicitní nastavení jazykových atributů
        document.documentElement.lang = 'cs-CZ';
        document.documentElement.setAttribute('translate', 'no');
        document.documentElement.classList.add('notranslate');

        // Kontrola a vytvoření meta tagů pro definici jazyka
        const ensureMetaTag = (name, content, isHttpEquiv = false) => {
            const selector = isHttpEquiv
                ? `meta[http-equiv="${name}"]`
                : `meta[name="${name}"]`;

            let meta = document.querySelector(selector);
            if (!meta) {
                meta = document.createElement('meta');
                if (isHttpEquiv) {
                    meta.setAttribute('http-equiv', name);
                } else {
                    meta.setAttribute('name', name);
                }
                meta.setAttribute('content', content);
                document.head.appendChild(meta);
            } else {
                meta.setAttribute('content', content);
            }
        };

        // Nastavení všech potřebných meta tagů pro jazyk
        ensureMetaTag('Content-Language', 'cs-CZ', true);
        ensureMetaTag('language', 'Czech');
        ensureMetaTag('google', 'notranslate');
        ensureMetaTag('translate', 'no');

        // Přidání explicitní informace o locale pro Google Chrome
        document.documentElement.setAttribute('data-locale', 'cs_CZ');

        // Aplikace jazykových atributů na klíčové elementy
        const applyLanguageAttributes = () => {
            document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, button, a, span')
                .forEach(el => {
                    if (!el.hasAttribute('lang')) {
                        el.setAttribute('lang', 'cs-CZ');
                    }
                    if (!el.hasAttribute('translate')) {
                        el.setAttribute('translate', 'no');
                    }
                });
        };

        // Inicializační aplikace + opakovaná kontrola pro případy dynamicky přidaného obsahu
        applyLanguageAttributes();
        const observer = new MutationObserver(applyLanguageAttributes);
        observer.observe(document.body, { childList: true, subtree: true });

        return () => observer.disconnect();
    }, []);

    // Přesměrování zpět na hlavní stránku, pokud je košík prázdný
    useEffect(() => {
        if (Object.keys(cartItems).length === 0) {
            router.push('/');
        }
    }, [cartItems, router]);

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

    return (
        <>
            {/* Inline skript pro okamžité nastavení jazyka před vykreslením stránky */}
            <Script
                id="language-force-script"
                strategy="beforeInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
                        document.documentElement.lang = 'cs-CZ';
                        document.documentElement.setAttribute('translate', 'no');
                        document.documentElement.classList.add('notranslate');
                    `,
                }}
            />

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
                </main>
            </div>
        </>
    );
};

export default OrderSummaryPage;
