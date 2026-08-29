'use client';

import React, { useState } from 'react';
import { X, ShoppingBag, Trash2, Minus, Plus, BookmarkPlus } from 'lucide-react';
import { Product } from '@/types/database';  // Přidáme import typu Product
import { normalizeProductCategory } from '@/lib/product-config';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchasing } from '@/contexts/PurchasingContext';
import { toast } from 'react-toastify';

type CartProps = {
    isOpen: boolean;
    onClose: () => void;
    cartItems: {[key: string]: number};
    products: Array<Product>;  // Použijeme importovaný typ Product
    onAddToCart: (productId: string | number, volume: string | number) => void;
    onRemoveFromCart: (productId: string | number, volume: string | number) => void;
    onRemoveLineFromCart: (productId: string | number, volume: string | number) => void;
    onClearCart: () => void;
    onGoToOrder: () => void;
    totalVolume: number;
};

const Cart = ({
    isOpen,
    onClose,
    cartItems,
    products,
    onAddToCart,
    onRemoveFromCart,
    onRemoveLineFromCart,
    onClearCart,
    onGoToOrder,
    totalVolume
}: CartProps) => {
    const { user } = useAuth();
    const { createTemplate } = usePurchasing();
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
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

    const saveTemplate = async () => {
        if (!templateName.trim() || isSavingTemplate) return;
        setIsSavingTemplate(true);
        try {
            await createTemplate(templateName, cartItems);
            toast.success('Šablona objednávky byla uložena.');
            setTemplateName('');
            setIsTemplateDialogOpen(false);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Šablonu se nepodařilo uložit.');
        } finally {
            setIsSavingTemplate(false);
        }
    };

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
                                const separatorIndex = key.lastIndexOf('-');
                                const productId = key.slice(0, separatorIndex);
                                const volume = key.slice(separatorIndex + 1);
                                const product = getProductDetails(productId);
                                if (!product) return null;

                                const display = getItemDisplay(product, volume, count);

                                return (
                                    <div key={key} className="flex items-center gap-3 p-4 bg-white border rounded-lg">
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
                                        <div className="flex shrink-0 items-center gap-2">
                                            <div className="flex items-center overflow-hidden rounded-lg border border-slate-200">
                                                <button type="button" onClick={() => onRemoveFromCart(productId, volume)} className="p-2 text-slate-600 hover:bg-slate-100" aria-label="Snížit množství"><Minus className="h-4 w-4" /></button>
                                                <span className="min-w-9 border-x border-slate-200 px-2 py-2 text-center text-sm font-semibold">{count}</span>
                                                <button type="button" onClick={() => onAddToCart(productId, volume)} className="p-2 text-slate-600 hover:bg-slate-100" aria-label="Zvýšit množství"><Plus className="h-4 w-4" /></button>
                                            </div>
                                            <button type="button" onClick={() => onRemoveLineFromCart(productId, volume)} className="p-2 hover:bg-red-50 rounded-full transition-colors" title="Odstranit celý řádek">
                                                <Trash2 className="w-5 h-5 text-red-500" />
                                            </button>
                                        </div>
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
                        {user && Object.keys(cartItems).length > 0 && (
                            <button type="button" onClick={() => setIsTemplateDialogOpen(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-200 px-4 py-2 font-medium text-blue-700 hover:bg-blue-50">
                                <BookmarkPlus className="h-4 w-4" />
                                Uložit jako šablonu
                            </button>
                        )}
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
            {isTemplateDialogOpen && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-950">Uložit košík jako šablonu</h3>
                        <label className="mt-4 block text-sm font-semibold text-slate-700" htmlFor="template-name">Název šablony</label>
                        <input id="template-name" autoFocus maxLength={80} value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Např. Pravidelný pondělní závoz" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                        <div className="mt-5 flex gap-2">
                            <button type="button" onClick={() => void saveTemplate()} disabled={!templateName.trim() || isSavingTemplate} className="min-h-11 flex-1 rounded-xl bg-blue-700 px-4 font-semibold text-white disabled:bg-slate-300">{isSavingTemplate ? 'Ukládám...' : 'Uložit'}</button>
                            <button type="button" onClick={() => setIsTemplateDialogOpen(false)} className="min-h-11 rounded-xl border border-slate-300 px-4 font-semibold text-slate-700">Zrušit</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Cart;
