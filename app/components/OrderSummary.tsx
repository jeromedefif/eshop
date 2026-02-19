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

const CATEGORY_ORDER = ['Víno', 'Ovocné víno', 'Nápoje', 'Dusík', 'Plyny', 'PET'];

const CATEGORY_THEME: Record<string, { icon: string; pill: string; volumeChip: string; label: string }> = {
    'Víno': {
        icon: 'text-purple-700',
        pill: 'bg-purple-50 text-purple-800',
        volumeChip: 'bg-purple-50 text-purple-800 border-purple-200',
        label: 'Víno'
    },
    'Ovocné víno': {
        icon: 'text-rose-700',
        pill: 'bg-rose-50 text-rose-800',
        volumeChip: 'bg-rose-50 text-rose-800 border-rose-200',
        label: 'Ovocné víno'
    },
    'Nápoje': {
        icon: 'text-blue-700',
        pill: 'bg-blue-50 text-blue-800',
        volumeChip: 'bg-blue-50 text-blue-800 border-blue-200',
        label: 'Nápoje'
    },
    'Dusík': {
        icon: 'text-cyan-700',
        pill: 'bg-cyan-50 text-cyan-800',
        volumeChip: 'bg-cyan-50 text-cyan-800 border-cyan-200',
        label: 'Dusík'
    },
    'Plyny': {
        icon: 'text-cyan-700',
        pill: 'bg-cyan-50 text-cyan-800',
        volumeChip: 'bg-cyan-50 text-cyan-800 border-cyan-200',
        label: 'Plyny'
    },
    'PET': {
        icon: 'text-amber-700',
        pill: 'bg-amber-50 text-amber-800',
        volumeChip: 'bg-amber-50 text-amber-800 border-amber-200',
        label: 'PET'
    },
    'default': {
        icon: 'text-gray-600',
        pill: 'bg-gray-100 text-gray-800',
        volumeChip: 'bg-gray-100 text-gray-800 border-gray-200',
        label: 'Ostatní'
    }
};

const OrderSummary = ({
    cartItems,
    products,
    onRemoveFromCart,
    onAddToCart,
    totalVolume
}: OrderSummaryProps) => {
    const getCategoryTheme = (category: string) => CATEGORY_THEME[category] || CATEGORY_THEME.default;

    const getCategoryIcon = (category: string) => {
        const { icon } = getCategoryTheme(category);

        switch(category) {
            case 'Víno':
                return <Grape className={`h-5 w-5 ${icon}`} />;
            case 'Ovocné víno':
                return <Wine className={`h-5 w-5 ${icon}`} />;
            case 'Nápoje':
                return <Martini className={`h-5 w-5 ${icon}`} />;
            case 'Dusík':
            case 'Plyny':
                return <TestTube className={`h-5 w-5 ${icon}`} />;
            case 'PET':
                return <Box className={`h-5 w-5 ${icon}`} />;
            default:
                return <Package className={`h-5 w-5 ${icon}`} />;
        }
    };

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

    const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
        const aIndex = CATEGORY_ORDER.includes(a) ? CATEGORY_ORDER.indexOf(a) : Number.MAX_SAFE_INTEGER;
        const bIndex = CATEGORY_ORDER.includes(b) ? CATEGORY_ORDER.indexOf(b) : Number.MAX_SAFE_INTEGER;
        return aIndex - bIndex;
    });

    const getItemText = (product: Product, volume: string) => {
        if (product.category === 'PET') {
            return 'balení';
        }
        if (product.category === 'Dusík' || product.category === 'Plyny') {
            return volume === 'maly' ? 'malý' : 'velký';
        }
        return `${volume}L`;
    };

    const getItemsCount = (count: number) => {
        if (count === 1) return 'položka';
        if (count >= 2 && count <= 4) return 'položky';
        return 'položek';
    };

    const handleRemoveItem = (productId: number, volume: string) => {
        const key = `${productId}-${volume}`;
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
            <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Přehled objednávky</h2>
                    <span className="text-sm text-gray-800">
                        {Object.keys(cartItems).length} {getItemsCount(Object.keys(cartItems).length)}
                    </span>
                </div>
            </div>

            <div className="p-4">
                <div className="space-y-4">
                    {sortedCategories.map((category) => {
                        const theme = getCategoryTheme(category);

                        return (
                            <div key={category} className="border-t first:border-t-0 pt-3 first:pt-0">
                                <h3 className={`text-sm font-semibold flex items-center gap-2 px-2.5 py-2 rounded-lg ${theme.pill}`}>
                                    {getCategoryIcon(category)}
                                    {theme.label}
                                    <span className="text-xs font-semibold opacity-80">
                                        ({groupedItems[category].length})
                                    </span>
                                </h3>

                                <div className="mt-2 space-y-1.5">
                                    {groupedItems[category].map(({ product, volume, count }) => (
                                        <div
                                            key={`${product.id}-${volume}`}
                                            className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold shrink-0 ${theme.volumeChip}`}>
                                                        {getItemText(product, volume)}
                                                    </span>
                                                    <span className="font-medium text-gray-900 truncate">
                                                        {product.name}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
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
                                                    className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                                                    title="Odebrat položku"
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

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
