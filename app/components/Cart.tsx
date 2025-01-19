'use client';

import React from 'react';
import { X, ShoppingBag, Trash2 } from 'lucide-react';
import { Product } from '@/types/database';  // Přidáme import typu Product

type CartProps = {
    isOpen: boolean;
    onClose: () => void;
    cartItems: {[key: string]: number};
    products: Array<Product>;  // Použijeme importovaný typ Product
    onRemoveFromCart: (productId: number, volume: string | number) => void;
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
    if (!isOpen) return null;

    const getProductDetails = (productId: number) => {
        return products.find(p => p.id === productId);
    };

    const getItemDisplay = (product: Product, volume: string, count: number) => {
        if (product.category === 'PET') {
            return {
                volumeText: '1x balení',
                totalText: `${count} balení`
            };
        }
        if (product.category === 'Dusík') {
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
               className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-40"
               onClick={onClose}
           />

            {/* Panel */}
            <div className="fixed inset-y-0 right-0 max-w-xl w-full bg-white shadow-xl z-50 flex flex-col">
                {/* Hlavička */}
                <div className="p-4 border-b flex justify-between items-center">
                    <div className="flex items-center">
                        <ShoppingBag className="h-6 w-6 text-gray-700 mr-2" />
                        <h2 className="text-lg font-bold text-gray-900">Košík</h2>
                        <span className="ml-2 bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                            {itemsCount} {getItemsText(itemsCount)}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Obsah */}
                <div className="flex-1 overflow-y-auto p-4">
                    {Object.keys(cartItems).length === 0 ? (
                        <div className="text-center text-gray-500 mt-8">
                            <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg">Košík je prázdný</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(cartItems).map(([key, count]) => {
                                const [productId, volume] = key.split('-');
                                const product = getProductDetails(parseInt(productId));
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
                                            onClick={() => onRemoveFromCart(parseInt(productId), volume)}
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
                <div className="border-t p-4 space-y-4">
                    {totalVolume > 0 && (
                        <div className="flex justify-between items-center py-2 border-b">
                            <span className="text-gray-600">Celkový objem nápojů:</span>
                            <span className="text-xl font-bold text-blue-600">{totalVolume}L</span>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <button
                            onClick={onGoToOrder}
                            disabled={Object.keys(cartItems).length === 0}
                            className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            Přejít k objednávce
                        </button>

                        {Object.keys(cartItems).length > 0 && (
                            <button
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
