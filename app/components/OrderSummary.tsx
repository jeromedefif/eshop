'use client';

import React from 'react';
import { Package, Wine, Grape, Martini, TestTube, Box, Trash2, Plus, Minus } from 'lucide-react';

type Product = {
    id: number;
    name: string;
    category: string;
    in_stock: boolean;
    created_at?: string;
};

type OrderSummaryProps = {
    cartItems: {[key: string]: number};
    products: Array<Product>;
    onRemoveFromCart: (productId: number, volume: string | number) => void;
    onAddToCart: (productId: number, volume: string | number) => void;
    totalVolume: number;
};

// Definice pořadí kategorií
const CATEGORY_ORDER = ['Víno', 'Ovocné víno', 'Nápoje', 'Dusík', 'PET'];

const OrderSummary = ({
    cartItems,
    products,
    onRemoveFromCart,
    onAddToCart,
    totalVolume
}: OrderSummaryProps) => {
    const getCategoryIcon = (category: string) => {
        switch(category) {
            case 'Víno':
                return <Grape className="h-5 w-5 text-gray-600" />;
            case 'Ovocné víno':
                return <Wine className="h-5 w-5 text-gray-600" />;
            case 'Nápoje':
                return <Martini className="h-5 w-5 text-gray-600" />;
            case 'Dusík':
                return <TestTube className="h-5 w-5 text-gray-600" />;
            case 'PET':
                return <Box className="h-5 w-5 text-gray-600" />;
            default:
                return <Package className="h-5 w-5 text-gray-600" />;
        }
    };

    // Seskupit položky podle kategorií
    const groupedItems = Object.entries(cartItems).reduce((acc, [key, count]) => {
        const [productId, volume] = key.split('-');
        const product = products.find(p => p.id === parseInt(productId));
        if (!product) return acc;

        if (!acc[product.category]) {
            acc[product.category] = [];
        }
        acc[product.category].push({ product, volume, count });
        return acc;
    }, {} as Record<string, Array<{ product: Product; volume: string; count: number }>>);

    // Seřazení kategorií podle definovaného pořadí
    const sortedCategories = Object.keys(groupedItems).sort(
        (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)
    );

    const getItemText = (product: Product, volume: string) => {
        if (product.category === 'PET') {
            return 'balení';
        }
        if (product.category === 'Dusík') {
            return volume === 'maly' ? 'malý' : 'velký';
        }
        return `${volume}L`;
    };

    // Helper pro české skloňování
    const getItemsCount = (count: number) => {
        if (count === 1) return 'položka';
        if (count >= 2 && count <= 4) return 'položky';
        return 'položek';
    };

    // Funkce pro úplné odstranění položky z košíku
    const handleRemoveItem = (productId: number, volume: string) => {
        // Odstraníme položku úplně, ne jen snížení množství
        const key = `${productId}-${volume}`;

        // Voláme funkci tolikrát, kolik je množství položky, abychom ji úplně odstranili
        const count = cartItems[key] || 0;
        for (let i = 0; i < count; i++) {
            onRemoveFromCart(productId, volume);
        }
    };

    const handleIncrement = (productId: number, volume: string) => {
        onAddToCart(productId, volume);
    };

    const handleDecrement = (productId: number, volume: string) => {
        onRemoveFromCart(productId, volume);
    };

    if (Object.keys(cartItems).length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center text-gray-700">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <p className="text-lg">Košík je prázdný</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Přehled objednávky</h2>
                    <span className="text-sm text-gray-800">
                        {Object.keys(cartItems).length} {getItemsCount(Object.keys(cartItems).length)}
                    </span>
                </div>
            </div>

            {/* Items list - nový design ve stylu skupin */}
            <div className="p-4">
                <div className="space-y-4">
                    {sortedCategories.map((category) => (
                        <div key={category} className="border-t first:border-t-0 pt-3 first:pt-0">
                            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 px-2 py-2 bg-gray-50 rounded-lg">
                                {getCategoryIcon(category)}
                                {category}
                                <span className="text-xs font-medium text-gray-800">
                                    ({groupedItems[category].length})
                                </span>
                            </h3>
                            <div className="mt-2 space-y-1">
                                {groupedItems[category].map(({ product, volume, count }) => (
                                    <div
                                        key={`${product.id}-${volume}`}
                                        className="flex items-center justify-between px-3 py-2 hover:bg-blue-50
                                                rounded-lg transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1">
                                                {/* Nové pořadí: objem, poté název produktu */}
                                                <span className="font-bold text-gray-900">
                                                    {product.category === 'PET' ? 'balení' :
                                                     product.category === 'Dusík' ? (volume === 'maly' ? 'malý' : 'velký') :
                                                     `${volume}L`} -
                                                </span>
                                                <span className="font-medium text-gray-900 ml-1">
                                                    {product.name}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Quantity controls */}
                                        <div className="flex items-center space-x-2">
                                            <div className="flex items-center bg-white border rounded-lg">
                                                <button
                                                    onClick={() => handleDecrement(product.id, volume)}
                                                    className="p-1 hover:bg-gray-100 rounded-l-lg border-r"
                                                    title="Snížit množství"
                                                >
                                                    <Minus className="w-4 h-4 text-gray-600" />
                                                </button>
                                                <span className="px-3 py-1 font-medium text-gray-800">
                                                    {count}
                                                </span>
                                                <button
                                                    onClick={() => handleIncrement(product.id, volume)}
                                                    className="p-1 hover:bg-gray-100 rounded-r-lg border-l"
                                                    title="Zvýšit množství"
                                                >
                                                    <Plus className="w-4 h-4 text-gray-600" />
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => handleRemoveItem(product.id, volume)}
                                                className="p-1.5 hover:bg-red-100 rounded-lg
                                                        transition-colors"
                                                title="Odebrat položku"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer with total */}
            {totalVolume > 0 && (
                <div className="border-t border-gray-100 p-4 bg-gray-50 rounded-b-lg">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-900 font-medium">Celkový objem:</span>
                        <span className="text-xl font-bold text-blue-600">
                            {totalVolume}L
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderSummary;
