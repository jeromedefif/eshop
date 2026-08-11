'use client';

import React from 'react';
import { Package, Wine, Grape, Martini, TestTube, Box, Trash2, Plus, Minus, Sparkles, Amphora } from 'lucide-react';
import type { Product } from '@/types/database';
import { normalizeProductCategory } from '@/lib/product-config';
import { sortOrderItems, STANDARD_ORDER_CATEGORIES } from '@/lib/order-item-sorting';

type OrderSummaryProps = {
    cartItems: {[key: string]: number};
    products: Array<Product>;
    onRemoveFromCart: (productId: string | number, volume: string | number) => void;
    onAddToCart: (productId: string | number, volume: string | number) => void;
    totalVolume: number;
};

const CATEGORY_THEME: Record<string, { icon: string; pill: string; volumeChip: string; label: string }> = {
    'Víno': {
        icon: 'text-purple-700',
        pill: 'bg-purple-50 text-purple-800',
        volumeChip: 'bg-purple-50 text-purple-800 border-purple-200',
        label: 'Víno'
    },
    'Perlivé': {
        icon: 'text-teal-700',
        pill: 'bg-teal-50 text-teal-800',
        volumeChip: 'bg-teal-50 text-teal-800 border-teal-200',
        label: 'Perlivé'
    },
    'Ovocné víno': {
        icon: 'text-rose-700',
        pill: 'bg-rose-50 text-rose-800',
        volumeChip: 'bg-rose-50 text-rose-800 border-rose-200',
        label: 'Ovocné víno'
    },
    'Burčák': {
        icon: 'text-orange-700',
        pill: 'bg-orange-50 text-orange-800',
        volumeChip: 'bg-orange-50 text-orange-800 border-orange-200',
        label: 'Burčák'
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

    const normalizeCategory = (category: string) => {
        return normalizeProductCategory(category);
    };

    const getCategoryIcon = (category: string) => {
        const { icon } = getCategoryTheme(category);

        switch(category) {
            case 'Víno':
                return <Grape className={`h-5 w-5 ${icon}`} />;
            case 'Perlivé':
                return <Sparkles className={`h-5 w-5 ${icon}`} />;
            case 'Ovocné víno':
                return <Wine className={`h-5 w-5 ${icon}`} />;
            case 'Burčák':
                return <Amphora className={`h-5 w-5 ${icon}`} />;
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

    type SummaryItem = { product: Product; volume: string; count: number; quantity: number };

    const sortedItems = sortOrderItems(Object.entries(cartItems).reduce((items, [key, count]) => {
        const [productId, volume] = key.split('-');
        const product = products.find(p => String(p.id) === productId);
        if (product) items.push({ product, volume, count, quantity: count });
        return items;
    }, [] as SummaryItem[]));

    // Standardní tekuté kategorie se mohou opakovat pro různé objemy. Zachováme
    // stávající vzhled kategorií, ale jejich sekce skládáme v pořadí položek.
    const displayGroups = sortedItems.reduce((groups, item) => {
        const category = normalizeCategory(item.product.category);
        const isStandard = STANDARD_ORDER_CATEGORIES.includes(category as typeof STANDARD_ORDER_CATEGORIES[number]);
        const canonicalVolume = String(item.volume).replace(/\s*l$/i, '');
        const key = isStandard ? `${canonicalVolume}-${category}` : category;
        const lastGroup = groups[groups.length - 1];

        if (lastGroup?.key === key) {
            lastGroup.items.push(item);
        } else {
            groups.push({ key, category, items: [item] });
        }
        return groups;
    }, [] as Array<{ key: string; category: string; items: SummaryItem[] }>);

    const getItemText = (product: Product, volume: string) => {
        const category = normalizeCategory(product.category);
        if (category === 'PET') {
            return 'balení';
        }
        if (category === 'Plyny') {
            return volume === 'maly' ? 'malý' : 'velký';
        }
        return /l\s*$/i.test(volume) ? volume : `${volume}L`;
    };

    const getItemsCount = (count: number) => {
        if (count === 1) return 'položka';
        if (count >= 2 && count <= 4) return 'položky';
        return 'položek';
    };

    const totalItemsCount = Object.values(cartItems).reduce((sum, count) => sum + count, 0);

    const handleRemoveItem = (productId: number | string, volume: string) => {
        const key = `${productId}-${volume}`;
        const count = cartItems[key] || 0;
        for (let i = 0; i < count; i++) {
            onRemoveFromCart(productId, volume);
        }
    };

    const handleIncrement = (productId: number | string, volume: string) => {
        onAddToCart(productId, volume);
    };

    const handleDecrement = (productId: number | string, volume: string) => {
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
                        {totalItemsCount} {getItemsCount(totalItemsCount)}
                    </span>
                </div>
            </div>

            <div className="p-4">
                <div className="space-y-4">
                    {displayGroups.map(({ key, category, items }) => {
                        const theme = getCategoryTheme(category);

                        return (
                            <div key={key} className="border-t first:border-t-0 pt-3 first:pt-0">
                                <h3 className={`text-sm font-semibold flex items-center gap-2 px-2.5 py-2 rounded-lg ${theme.pill}`}>
                                    {getCategoryIcon(category)}
                                    {theme.label}
                                    <span className="text-xs font-semibold opacity-80">
                                        ({items.length})
                                    </span>
                                </h3>

                                <div className="mt-2 space-y-1.5">
                                    {items.map(({ product, volume, count }) => (
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
