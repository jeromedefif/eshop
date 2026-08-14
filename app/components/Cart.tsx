'use client';

import React from 'react';
import { X, ShoppingBag, Trash2 } from 'lucide-react';
import { Product } from '@/types/database';  // Přidáme import typu Product
import { normalizeProductCategory } from '@/lib/product-config';

type CartProps = {
    isOpen: boolean;
    onClose: () => void;
    cartItems: {[key: string]: number};
    products: Array<Product>;  // Použijeme importovaný typ Product
    onRemoveFromCart: (productId: string | number, volume: string | number) => void;
    onClearCart: () => void;
    onGoToOrder: () => void;
    totalVolume: number;
};

const Cart = ({
    isOpen,
    onClose,
    cartItems,
    products,
    onRemoveFromCart,
    onClearCart,
    onGoToOrder,
    totalVolume
}: CartProps) => {
    React.useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const getProductDetails = (productId: string | number) => {
        return products.find(p => String(p.id) === String(productId));
    };

    const getItemDisplay = (product: Product, volume: string, count: number) => {
        const category = normalizeProductCategory(product.category);
        if (category === 'PET') {
            return {
                volumeText: '1x balení',
                totalText: `${count} balení`
            };
        }
        if (category === 'Plyny') {
            return {
                volumeText: volume === 'maly' ? 'malý' : 'velký',
                totalText: `${count}x ${volume === 'maly' ? 'malý' : 'velký'}`
            };
        }
        return {
            volumeText: `${volume}L`,
            totalText: `${parseInt(volume as string) * count}L`
        };
    };

    const itemsCount = Object.values(cartItems).reduce((sum, count) => sum + count, 0);

    // Pomocná funkce pro české skloňování
    const getItemsText = (count: number) => {
        if (count === 1) return 'položka';
        if (count >= 2 && count <= 4) return 'položky';
        return 'položek';
    };

    return (
       <>
           {/* Overlay */}
           <div
               className="fixed inset-0 z-[60] bg-black bg-opacity-50 transition-opacity"
               onClick={onClose}
           />

            {/* Panel */}
            <div className="fixed inset-y-0 right-0 z-[70] flex h-[100dvh] max-h-[100dvh] w-full max-w-xl flex-col overflow-hidden bg-white shadow-xl">
                {/* Hlavička */}
                <div className="shrink-0 p-4 border-b flex justify-between items-center">
                    <div className="flex items-center">
                        <ShoppingBag className="h-6 w-6 text-gray-700 mr-2" />
                        <h2 className="text-lg font-bold text-gray-900">Košík</h2>
                        <span className="ml-2 bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                            {itemsCount} {getItemsText(itemsCount)}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Obsah */}
                <div
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"
                    style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
                >
                    {Object.keys(cartItems).length === 0 ? (
                        <div className="text-center text-gray-500 mt-8">
                            <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg">Košík je prázdný</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(cartItems).map(([key, count]) => {
                                const [productId, volume] = key.split('-');
                                const product = getProductDetails(productId);
                                if (!product) return null;

                                const display = getItemDisplay(product, volume, count);

                                return (
                                    <div key={key} className="flex items-center p-4 bg-white border rounded-lg">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-gray-900">
                                                {product.name}
                                            </h3>
                                            <p className="text-gray-600">
                                                {display.volumeText} × {count}
                                            </p>
                                            <p className="text-sm text-blue-600 font-medium">
                                                Celkem: {display.totalText}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onRemoveFromCart(productId, volume)}
                                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                            title="Odebrat položku"
                                        >
                                            <Trash2 className="w-5 h-5 text-red-500" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Patička */}
                <div
                    className="shrink-0 border-t p-4 space-y-4 bg-white"
                    style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
                >
                    {totalVolume > 0 && (
                        <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-gray-600">Celkový objem nápojů:</span>
                            <span className="text-xl font-bold text-blue-600">{totalVolume}L</span>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <button
                            type="button"
                            onClick={onGoToOrder}
                            disabled={Object.keys(cartItems).length === 0}
                            className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            Přejít k objednávce
                        </button>

                        {Object.keys(cartItems).length > 0 && (
                            <button
                                type="button"
                                onClick={onClearCart}
                                className="w-full py-2 px-4 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors border border-red-200"
                            >
                                Vyprázdnit košík
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Cart;
