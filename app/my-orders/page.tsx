'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Package, ShoppingCart, Loader2, ChevronDown, Bookmark, Heart, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCart, type CartItems } from '@/contexts/CartContext';
import { usePurchasing } from '@/contexts/PurchasingContext';
import { toast } from 'react-toastify';
import { getAllowedVolumes } from '@/lib/product-config';
import CustomerPageState from '@/components/CustomerPageState';
import CustomerPageShell from '@/components/CustomerPageShell';
import type { Product } from '@/types/database';
import type { SavedOrderTemplate } from '@/types/purchasing';

// Konstanty - velmi minimální změna
const PAGE_SIZE = 5;

type OrderItem = {
    id: string;
    product_id: string | number;
    volume: string;
    quantity: number;
    product: Product | null;
};

type CustomerOrder = {
    id: string;
    created_at: string;
    status: string;
    total_volume?: number | null;
    order_items: OrderItem[];
};

const MyOrdersPage = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<CustomerOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const { requestCartImport, addToCart, removeFromCart, cartItems, products } = useCart();
    const { templates, favoriteProductIds, isLoading: isPurchasingLoading, createTemplate, renameTemplate, deleteTemplate } = usePurchasing();
    const [activeTab, setActiveTab] = useState<'history' | 'templates' | 'favorites'>('history');
    const [savingOrderId, setSavingOrderId] = useState<string | null>(null);

    // Minimální nové proměnné pro paginaci
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMoreOrders, setHasMoreOrders] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Upravený useEffect - podobný původnímu
    useEffect(() => {
        if (!user) {
            router.push('/');
            return;
        }

        const fetchOrders = async () => {
            try {
                // Načítáme první stránku stejně jako v původním kódu
                const { data, error, count } = await supabase
                    .from('orders')
                    .select(`
                        *,
                        order_items (
                            id,
                            product_id,
                            volume,
                            quantity,
                            product:products (
                                id,
                                name,
                                category,
                                in_stock,
                                is_archived,
                                min_order_qty,
                                allowed_volumes
                            )
                        )
                    `, { count: 'exact' })
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .range(0, PAGE_SIZE - 1);

                if (error) {
                    throw error;
                }

                setOrders((data || []) as unknown as CustomerOrder[]);

                // Zjistíme, zda existují další objednávky
                setHasMoreOrders((count || 0) > PAGE_SIZE);
                setCurrentPage(0);
            } catch (error) {
                console.error('Error fetching orders:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [user, router]);

    // Nová funkce pro načítání dalších objednávek
    const loadMoreOrders = async () => {
        if (!user || isLoadingMore) return;

        setIsLoadingMore(true);

        try {
            const nextPage = currentPage + 1;
            const startIndex = nextPage * PAGE_SIZE;
            const endIndex = startIndex + PAGE_SIZE - 1;

            const { data, error, count } = await supabase
                .from('orders')
                .select(`
                    *,
                    order_items (
                        id,
                        product_id,
                        volume,
                        quantity,
                        product:products (
                            id,
                            name,
                            category,
                            in_stock,
                            is_archived,
                            min_order_qty,
                            allowed_volumes
                        )
                    )
                `, { count: 'exact' })
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .range(startIndex, endIndex);

            if (error) {
                throw error;
            }

            // Přidáme nové objednávky k existujícím
            setOrders(prevOrders => [...prevOrders, ...((data || []) as unknown as CustomerOrder[])]);

            // Aktualizujeme stránku a zkontrolujeme, zda existují další objednávky
            setCurrentPage(nextPage);
            setHasMoreOrders((count || 0) > (nextPage + 1) * PAGE_SIZE);
        } catch (error) {
            console.error('Error loading more orders:', error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    // Zde zachováváme původní handleReorder beze změny
    const handleReorder = async (order: CustomerOrder) => {
        // Kontrola dostupnosti položek
        const unavailableItems = order.order_items.filter((item) => !item.product || !item.product.in_stock || item.product.is_archived || !getAllowedVolumes(item.product).includes(String(item.volume)));

        if (unavailableItems.length > 0) {
            // Upozornění na nedostupné položky
            const itemNames = unavailableItems.map((item) => item.product?.name || 'smazaný produkt').join(', ');
            alert(`Následující položky již nejsou skladem: ${itemNames}`);

            // Do košíku přidáme pouze dostupné položky
            const newCartItems: {[key: string]: number} = {};
            order.order_items.forEach((item) => {
                if (item.product?.in_stock && !item.product.is_archived && getAllowedVolumes(item.product).includes(String(item.volume))) {
                    const key = `${item.product_id}-${item.volume}`;
                    newCartItems[key] = Math.max(item.quantity, item.product.min_order_qty || 1);
                }
            });

            const result = await requestCartImport(newCartItems, `objednávka #${order.id.substring(0, 8)}`);
            if (result === 'cancelled') return;
        } else {
            // Všechny položky jsou dostupné
            const newCartItems: {[key: string]: number} = {};
            order.order_items.forEach((item) => {
                const key = `${item.product_id}-${item.volume}`;
                newCartItems[key] = Math.max(item.quantity, item.product?.min_order_qty || 1);
            });
            const result = await requestCartImport(newCartItems, `objednávka #${order.id.substring(0, 8)}`);
            if (result === 'cancelled') return;
        }

        // Přesměrování na souhrn objednávky
        router.push('/order-summary');
    };

    const orderToCart = (order: CustomerOrder): CartItems => order.order_items.reduce((items: CartItems, item) => {
        if (!item.product) return items;
        const key = `${item.product_id}-${item.volume}`;
        items[key] = (items[key] || 0) + Math.max(item.quantity, item.product.min_order_qty || 1);
        return items;
    }, {});

    const saveOrderAsTemplate = async (order: CustomerOrder) => {
        const suggestedName = `Objednávka ${new Date(order.created_at).toLocaleDateString('cs-CZ')}`;
        const name = window.prompt('Název šablony:', suggestedName)?.trim();
        if (!name) return;
        setSavingOrderId(order.id);
        try {
            await createTemplate(name, orderToCart(order));
            toast.success('Objednávka byla uložena jako šablona.');
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Šablonu se nepodařilo uložit.');
        } finally {
            setSavingOrderId(null);
        }
    };

    const applyTemplate = async (template: SavedOrderTemplate) => {
        const nextItems: CartItems = {};
        const unavailable: string[] = [];
        template.items.forEach((item) => {
            const product = products.find((candidate) => String(candidate.id) === String(item.product_id));
            if (!product || product.is_archived || !product.in_stock || !getAllowedVolumes(product).includes(String(item.volume))) {
                unavailable.push(product?.name || 'Nedostupný produkt');
                return;
            }
            nextItems[`${item.product_id}-${item.volume}`] = Math.max(item.quantity, product.min_order_qty || 1);
        });
        if (Object.keys(nextItems).length === 0) {
            toast.error('Šablona neobsahuje žádné aktuálně dostupné položky.');
            return;
        }
        const result = await requestCartImport(nextItems, `šablona „${template.name}“`);
        if (result === 'cancelled') return;
        if (unavailable.length > 0) toast.warning(`Nedostupné položky nebyly přidány: ${unavailable.join(', ')}`);
        router.push('/order-summary');
    };

    const handleRenameTemplate = async (template: SavedOrderTemplate) => {
        const name = window.prompt('Nový název šablony:', template.name)?.trim();
        if (!name || name === template.name) return;
        try {
            await renameTemplate(template.id, name);
            toast.success('Šablona byla přejmenována.');
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Šablonu se nepodařilo přejmenovat.');
        }
    };

    const handleDeleteTemplate = async (template: SavedOrderTemplate) => {
        if (!window.confirm(`Opravdu chcete smazat šablonu „${template.name}“?`)) return;
        try {
            await deleteTemplate(template.id);
            toast.success('Šablona byla smazána.');
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Šablonu se nepodařilo smazat.');
        }
    };

    const favoriteProducts = products.filter((product) => favoriteProductIds.has(String(product.id)));

    // Zachování původní funkce formátování data
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('cs-CZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Zachování původní funkce getStatusLabel
    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Čeká na zpracování</span>;
            case 'confirmed':
                return <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Potvrzeno</span>;
            case 'completed':
                return <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Dokončeno</span>;
            case 'cancelled':
                return <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Zrušeno</span>;
            default:
                return <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">{status}</span>;
        }
    };

    if (loading) {
        return (
            <CustomerPageState
                loading
                title="Načítáme vaše objednávky"
                description="Připravujeme historii objednávek a jejich položky."
            />
        );
    }

    return (
        <CustomerPageShell width="5xl">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-950">Moje objednávky</h1>
                    <p className="mt-2 text-sm text-slate-600">Historie, uložené šablony a oblíbené produkty na jednom místě.</p>
                </div>

                <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm" role="tablist" aria-label="Nákupní přehled">
                    {[
                        { id: 'history', label: 'Historie', icon: Package },
                        { id: 'templates', label: 'Šablony', icon: Bookmark },
                        { id: 'favorites', label: 'Oblíbené', icon: Heart }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 font-semibold transition ${activeTab === tab.id ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                                <Icon className="h-4 w-4" />{tab.label}
                            </button>
                        );
                    })}
                </div>

                {activeTab === 'history' && (orders.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                            <Package className="h-7 w-7 text-slate-500" />
                        </div>
                        <p className="text-lg font-semibold text-slate-800">Zatím nemáte žádné objednávky</p>
                        <Link
                            href="/"
                            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-blue-700 px-5 py-2.5 font-semibold text-white hover:bg-blue-800"
                        >
                            Přejít do katalogu
                        </Link>
                    </div>
                ) : (
                    <div>
                        <div className="space-y-4">
                            {orders.map((order) => (
                                <article key={order.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md">
                                    <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                                        <div>
                                            <div className="flex items-center space-x-3">
                                                <span className="font-semibold text-gray-900">Objednávka #{order.id.substring(0, 8)}</span>
                                                {getStatusLabel(order.status)}
                                            </div>
                                            <div className="text-sm text-gray-500 mt-1">
                                                {formatDate(order.created_at)}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <button onClick={() => void saveOrderAsTemplate(order)} disabled={savingOrderId === order.id} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-200 px-4 py-2.5 font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60">
                                                <Bookmark className="mr-2 h-4 w-4" />
                                                {savingOrderId === order.id ? 'Ukládám...' : 'Uložit jako šablonu'}
                                            </button>
                                            <button onClick={() => void handleReorder(order)} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800">
                                                <ShoppingCart className="h-4 w-4 mr-2" />Objednat znovu
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-4 sm:p-5">
                                        <h3 className="font-medium text-gray-900 mb-2">Položky objednávky:</h3>
                                        <ul className="space-y-2">
                                            {order.order_items.map((item) => (
                                                <li key={item.id} className="flex justify-between items-center">
                                                    <div className="text-gray-800">
                                                        {(item.product?.name || 'Smazaný produkt')} - {item.volume === 'maly'
                                                            ? 'malý'
                                                            : item.volume === 'velky'
                                                                ? 'velký'
                                                                : `${item.volume}L`} x {item.quantity}
                                                    </div>
                                                    {item.product && !item.product.in_stock && (
                                                        <span className="text-red-600 text-sm">Není skladem</span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
                                            <span className="font-medium text-gray-700">Celkový objem:</span>
                                            <span className="font-bold text-blue-600">{order.total_volume}L</span>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        {/* Tlačítko pro načtení dalších objednávek - jediný nový prvek v UI */}
                        {hasMoreOrders && (
                            <div className="mt-6 text-center">
                                <button
                                    onClick={loadMoreOrders}
                                    disabled={isLoadingMore}
                                    className="mx-auto flex min-h-11 items-center rounded-xl bg-blue-700 px-5 py-2.5 font-semibold text-white hover:bg-blue-800
                                             disabled:cursor-not-allowed disabled:bg-blue-300"
                                >
                                    {isLoadingMore ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Načítám...
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="h-4 w-4 mr-2" />
                                            Načíst další objednávky
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {activeTab === 'templates' && (
                    <div className="space-y-4">
                        {isPurchasingLoading ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />Načítám šablony...</div>
                        ) : templates.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                                <Bookmark className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                                <h2 className="text-lg font-bold text-slate-900">Zatím nemáte uloženou šablonu</h2>
                                <p className="mt-2 text-sm text-slate-600">Šablonu můžete uložit z košíku nebo z libovolné objednávky v historii.</p>
                            </div>
                        ) : templates.map((template) => (
                            <article key={template.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">{template.name}</h2>
                                        <p className="mt-1 text-sm text-slate-500">{template.items.length} různých položek · upraveno {new Date(template.updated_at).toLocaleDateString('cs-CZ')}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button type="button" onClick={() => void applyTemplate(template)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800"><ShoppingCart className="h-4 w-4" />Použít</button>
                                        <button type="button" onClick={() => void handleRenameTemplate(template)} className="min-h-11 rounded-xl border border-slate-300 p-3 text-slate-600 hover:bg-slate-50" title="Přejmenovat"><Pencil className="h-4 w-4" /></button>
                                        <button type="button" onClick={() => void handleDeleteTemplate(template)} className="min-h-11 rounded-xl border border-red-200 p-3 text-red-600 hover:bg-red-50" title="Smazat"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                {activeTab === 'favorites' && (
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        {isPurchasingLoading ? (
                            <div className="p-10 text-center text-slate-500"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />Načítám oblíbené...</div>
                        ) : favoriteProducts.length === 0 ? (
                            <div className="p-10 text-center">
                                <Heart className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                                <h2 className="text-lg font-bold text-slate-900">Nemáte označené oblíbené produkty</h2>
                                <Link href="/" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-blue-700 px-5 font-semibold text-white">Vybrat v katalogu</Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-200">
                                {favoriteProducts.map((product) => (
                                    <div key={product.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div><h2 className="font-bold text-slate-900">{product.name}</h2><p className="text-sm text-slate-500">{product.category}</p></div>
                                        <div className="flex flex-wrap gap-2">
                                            {getAllowedVolumes(product).map((volume) => {
                                                const count = cartItems[`${product.id}-${volume}`] || 0;
                                                const isInCart = count > 0;
                                                const label = volume === 'maly' ? 'malý' : volume === 'velky' ? 'velký' : volume === 'baleni' ? 'balení' : `${volume}L`;

                                                return (
                                                    <div key={`${product.id}-${volume}`} className="relative">
                                                        <button
                                                            type="button"
                                                            disabled={!product.in_stock || product.is_archived}
                                                            onClick={() => addToCart(product.id, volume)}
                                                            className={`min-h-10 min-w-[48px] rounded-lg border px-3 text-sm font-semibold transition-colors duration-150 ${
                                                                isInCart
                                                                    ? 'border-blue-500 bg-blue-600/15 text-blue-700 hover:bg-blue-600/25'
                                                                    : 'border-gray-300 bg-white text-gray-900 hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100'
                                                            } disabled:cursor-not-allowed disabled:opacity-40`}
                                                        >
                                                            {label}
                                                        </button>
                                                        {isInCart && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeFromCart(product.id, volume)}
                                                                className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white shadow-sm transition-colors duration-150 hover:bg-red-600"
                                                                aria-label={`Snížit množství ${product.name}, ${label} o 1`}
                                                                title="Kliknutím snížíte počet o 1"
                                                            >
                                                                {count}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
        </CustomerPageShell>
    );
};

export default MyOrdersPage;
