'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Package, ShoppingCart, Loader2, ChevronDown, Bookmark, Heart, Pencil, Trash2, History, Search, ArrowRight, CalendarDays, Layers3 } from 'lucide-react';
import Link from 'next/link';
import { useCart, type CartItems } from '@/contexts/CartContext';
import { usePurchasing } from '@/contexts/PurchasingContext';
import { toast } from 'react-toastify';
import { getAllowedVolumes } from '@/lib/product-config';
import CustomerPageState from '@/components/CustomerPageState';
import CustomerPageShell from '@/components/CustomerPageShell';
import type { Product } from '@/types/database';
import type { SavedOrderTemplate } from '@/types/purchasing';
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from '@/lib/analytics/client';

// Konstanty - velmi minimální změna
const PAGE_SIZE = 5;

const formatCzechCount = (count: number, singular: string, paucal: string, plural: string) => {
    if (count === 1) return `${count} ${singular}`;
    if (count >= 2 && count <= 4) return `${count} ${paucal}`;
    return `${count} ${plural}`;
};

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

type PreviouslyOrderedStat = {
    productId: string;
    lastOrderedAt: string;
    orderCount: number;
    totalQuantity: number;
    preferredVolume: string;
    preferredVolumeQuantity: number;
};

type HistoricalOrder = {
    id: string;
    created_at: string;
    order_items: Array<{
        product_id: string | number;
        volume: string;
        quantity: number;
    }>;
};

const MyOrdersPage = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<CustomerOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const { requestCartImport, addToCart, removeFromCart, cartItems, products } = useCart();
    const { templates, favoriteProductIds, isLoading: isPurchasingLoading, createTemplate, renameTemplate, deleteTemplate } = usePurchasing();
    const [activeTab, setActiveTab] = useState<'history' | 'previouslyOrdered' | 'templates' | 'favorites'>('history');
    const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
    const [previouslyOrderedStats, setPreviouslyOrderedStats] = useState<PreviouslyOrderedStat[]>([]);
    const [isPreviouslyOrderedLoading, setIsPreviouslyOrderedLoading] = useState(false);
    const [previouslyOrderedLoaded, setPreviouslyOrderedLoaded] = useState(false);
    const [previouslyOrderedSearch, setPreviouslyOrderedSearch] = useState('');
    const [previouslyOrderedError, setPreviouslyOrderedError] = useState(false);

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

    useEffect(() => {
        setPreviouslyOrderedStats([]);
        setPreviouslyOrderedLoaded(false);
        setPreviouslyOrderedSearch('');
        setPreviouslyOrderedError(false);
    }, [user?.id]);

    useEffect(() => {
        if (!user || activeTab !== 'previouslyOrdered' || previouslyOrderedLoaded || isPreviouslyOrderedLoading) return;

        const fetchPreviouslyOrdered = async () => {
            setIsPreviouslyOrderedLoading(true);
            setPreviouslyOrderedError(false);

            try {
                const pageSize = 200;
                let from = 0;
                const historicalOrders: HistoricalOrder[] = [];

                // Načítáme celou historii po dávkách, aby přehled nebyl omezený stránkováním historie objednávek.
                while (true) {
                    const { data, error } = await supabase
                        .from('orders')
                        .select(`
                            id,
                            created_at,
                            order_items (
                                product_id,
                                volume,
                                quantity
                            )
                        `)
                        .eq('user_id', user.id)
                        .in('status', ['pending', 'confirmed', 'completed'])
                        .order('created_at', { ascending: false })
                        .range(from, from + pageSize - 1);

                    if (error) throw error;

                    const page = (data || []) as unknown as HistoricalOrder[];
                    historicalOrders.push(...page);
                    if (page.length < pageSize) break;
                    from += pageSize;
                }

                const aggregates = new Map<string, {
                    lastOrderedAt: string;
                    orderCount: number;
                    totalQuantity: number;
                    volumes: Map<string, number>;
                }>();

                historicalOrders.forEach((order) => {
                    const productsInOrder = new Set<string>();

                    (order.order_items || []).forEach((item) => {
                        const productId = String(item.product_id);
                        const quantity = Number(item.quantity) || 0;
                        const volume = String(item.volume);
                        const current = aggregates.get(productId) || {
                            lastOrderedAt: order.created_at,
                            orderCount: 0,
                            totalQuantity: 0,
                            volumes: new Map<string, number>()
                        };

                        if (new Date(order.created_at).getTime() > new Date(current.lastOrderedAt).getTime()) {
                            current.lastOrderedAt = order.created_at;
                        }
                        current.totalQuantity += quantity;
                        current.volumes.set(volume, (current.volumes.get(volume) || 0) + quantity);
                        aggregates.set(productId, current);
                        productsInOrder.add(productId);
                    });

                    productsInOrder.forEach((productId) => {
                        const current = aggregates.get(productId);
                        if (current) current.orderCount += 1;
                    });
                });

                const stats = Array.from(aggregates.entries()).map(([productId, aggregate]) => {
                    const [preferredVolume, preferredVolumeQuantity] = Array.from(aggregate.volumes.entries())
                        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'cs', { numeric: true }))[0] || ['', 0];

                    return {
                        productId,
                        lastOrderedAt: aggregate.lastOrderedAt,
                        orderCount: aggregate.orderCount,
                        totalQuantity: aggregate.totalQuantity,
                        preferredVolume,
                        preferredVolumeQuantity
                    };
                }).sort((a, b) => new Date(b.lastOrderedAt).getTime() - new Date(a.lastOrderedAt).getTime());

                setPreviouslyOrderedStats(stats);
            } catch (error) {
                console.error('Error fetching previously ordered products:', error);
                setPreviouslyOrderedError(true);
                toast.error('Dříve objednané produkty se nepodařilo načíst.');
            } finally {
                setPreviouslyOrderedLoaded(true);
                setIsPreviouslyOrderedLoading(false);
            }
        };

        void fetchPreviouslyOrdered();
    }, [activeTab, isPreviouslyOrderedLoading, previouslyOrderedLoaded, user]);

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

        trackAnalyticsEvent(ANALYTICS_EVENTS.historyOrderUsed, {
            source: 'history',
            itemCount: order.order_items.reduce((sum, item) => sum + item.quantity, 0),
        });

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
        trackAnalyticsEvent(ANALYTICS_EVENTS.templateUsed, {
            source: 'template',
            itemCount: Object.values(nextItems).reduce((sum, quantity) => sum + quantity, 0),
        });
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
    const latestOrder = orders[0] || null;
    const cartLineCount = Object.keys(cartItems).length;
    const cartQuantity = Object.values(cartItems).reduce((total, quantity) => total + quantity, 0);

    const previouslyOrderedProducts = useMemo(() => {
        const productMap = new Map(products.map((product) => [String(product.id), product]));
        const query = previouslyOrderedSearch.trim().toLocaleLowerCase('cs-CZ');

        return previouslyOrderedStats.flatMap((stat) => {
            const product = productMap.get(stat.productId);
            if (!product || product.is_archived) return [];
            if (query && !`${product.name} ${product.category}`.toLocaleLowerCase('cs-CZ').includes(query)) return [];
            return [{ product, stat }];
        });
    }, [previouslyOrderedSearch, previouslyOrderedStats, products]);

    const formatVolumeLabel = (volume: string) => volume === 'maly'
        ? 'malý'
        : volume === 'velky'
            ? 'velký'
            : volume === 'baleni'
                ? 'balení'
                : `${volume}L`;

    const renderCartVolumeControls = (product: Product) => (
        <div className="flex flex-wrap gap-2">
            {getAllowedVolumes(product).map((volume) => {
                const count = cartItems[`${product.id}-${volume}`] || 0;
                const isInCart = count > 0;
                const label = formatVolumeLabel(volume);

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
    );

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
                    <p className="mt-2 text-sm text-slate-600">Historie, dříve objednané produkty, uložené šablony a oblíbené na jednom místě.</p>
                </div>

                <section className="mb-6 grid gap-4 lg:grid-cols-2" aria-label="Rychlý přehled nákupů">
                    <article className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white shadow-sm sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">Poslední objednávka</p>
                                {latestOrder ? (
                                    <>
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            <p className="text-xl font-bold">#{latestOrder.id.substring(0, 8)}</p>
                                            {getStatusLabel(latestOrder.status)}
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
                                            <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />{formatDate(latestOrder.created_at)}</span>
                                            <span className="font-semibold text-white">{latestOrder.total_volume || 0} L</span>
                                        </div>
                                    </>
                                ) : (
                                    <p className="mt-3 text-sm leading-6 text-slate-300">Po první objednávce zde najdete nejrychlejší cestu k jejímu zopakování.</p>
                                )}
                            </div>
                            <Package className="h-8 w-8 shrink-0 text-blue-300" />
                        </div>
                        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                            {latestOrder ? (
                                <button type="button" onClick={() => void handleReorder(latestOrder)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 font-semibold text-white hover:bg-blue-500">
                                    <ShoppingCart className="h-4 w-4" />Objednat znovu
                                </button>
                            ) : (
                                <Link href="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 font-semibold text-white hover:bg-blue-500">
                                    Přejít do katalogu<ArrowRight className="h-4 w-4" />
                                </Link>
                            )}
                            {latestOrder && (
                                <button type="button" onClick={() => setActiveTab('history')} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 px-4 font-semibold text-white hover:bg-white/10">
                                    Zobrazit v historii
                                </button>
                            )}
                        </div>
                    </article>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Link href={cartQuantity > 0 ? '/order-summary' : '/'} className="group rounded-2xl border border-blue-200 bg-blue-50 p-4 transition hover:border-blue-300 hover:bg-blue-100">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-bold text-slate-950">Rozpracovaný košík</p>
                                    <p className="mt-1 text-sm text-slate-600">{cartQuantity > 0 ? `${cartQuantity} ks · ${formatCzechCount(cartLineCount, 'položka', 'položky', 'položek')}` : 'Košík je zatím prázdný'}</p>
                                </div>
                                <ShoppingCart className="h-5 w-5 text-blue-700" />
                            </div>
                            <p className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-700">{cartQuantity > 0 ? 'Pokračovat v objednávce' : 'Otevřít katalog'}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></p>
                        </Link>

                        <button type="button" onClick={() => setActiveTab('favorites')} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-rose-200 hover:bg-rose-50">
                            <div className="flex items-start justify-between gap-3">
                                <div><p className="font-bold text-slate-950">Oblíbené položky</p><p className="mt-1 text-sm text-slate-600">{formatCzechCount(favoriteProductIds.size, 'uložený produkt', 'uložené produkty', 'uložených produktů')}</p></div>
                                <Heart className="h-5 w-5 text-rose-600" />
                            </div>
                            <p className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-slate-700">Zobrazit oblíbené<ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></p>
                        </button>

                        <button type="button" onClick={() => setActiveTab('templates')} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-amber-200 hover:bg-amber-50">
                            <div className="flex items-start justify-between gap-3">
                                <div><p className="font-bold text-slate-950">Uložené šablony</p><p className="mt-1 text-sm text-slate-600">{formatCzechCount(templates.length, 'uložená sestava', 'uložené sestavy', 'uložených sestav')}</p></div>
                                <Bookmark className="h-5 w-5 text-amber-600" />
                            </div>
                            <p className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-slate-700">Zobrazit šablony<ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></p>
                        </button>

                        <button type="button" onClick={() => setActiveTab('previouslyOrdered')} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-200 hover:bg-emerald-50">
                            <div className="flex items-start justify-between gap-3">
                                <div><p className="font-bold text-slate-950">Dříve objednané</p><p className="mt-1 text-sm text-slate-600">Výběr produktů z celé historie</p></div>
                                <Layers3 className="h-5 w-5 text-emerald-700" />
                            </div>
                            <p className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-slate-700">Vybrat produkty<ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></p>
                        </button>
                    </div>
                </section>

                <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm" role="tablist" aria-label="Nákupní přehled">
                    {[
                        { id: 'history', label: 'Historie', icon: Package },
                        { id: 'previouslyOrdered', label: 'Dříve objednané', icon: History },
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

                {activeTab === 'previouslyOrdered' && (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="search"
                                    value={previouslyOrderedSearch}
                                    onChange={(event) => setPreviouslyOrderedSearch(event.target.value)}
                                    placeholder="Vyhledat v dříve objednaných produktech..."
                                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>

                        {isPreviouslyOrderedLoading || (previouslyOrderedStats.length > 0 && products.length === 0) ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                                <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />Načítám dříve objednané produkty...
                            </div>
                        ) : previouslyOrderedError ? (
                            <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
                                <h2 className="text-lg font-bold text-slate-900">Produkty se nepodařilo načíst</h2>
                                <p className="mt-2 text-sm text-slate-600">Zkuste načtení zopakovat.</p>
                                <button
                                    type="button"
                                    onClick={() => setPreviouslyOrderedLoaded(false)}
                                    className="mt-4 min-h-11 rounded-xl bg-blue-700 px-5 font-semibold text-white hover:bg-blue-800"
                                >
                                    Načíst znovu
                                </button>
                            </div>
                        ) : previouslyOrderedProducts.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                                <History className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                                <h2 className="text-lg font-bold text-slate-900">
                                    {previouslyOrderedSearch ? 'Žádný produkt neodpovídá hledání' : 'Zatím nemáte dříve objednané produkty'}
                                </h2>
                                <p className="mt-2 text-sm text-slate-600">
                                    {previouslyOrderedSearch ? 'Zkuste upravit hledaný výraz.' : 'Po první objednávce zde najdete rychlý výběr produktů napříč celou historií.'}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                {previouslyOrderedProducts.map(({ product, stat }) => (
                                    <article key={product.id} className="flex flex-col gap-4 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="font-bold text-slate-900">{product.name}</h2>
                                                {!product.in_stock && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Není skladem</span>}
                                            </div>
                                            <p className="mt-1 text-sm text-slate-500">{product.category}</p>
                                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                                                <span>Naposledy {new Date(stat.lastOrderedAt).toLocaleDateString('cs-CZ')}</span>
                                                <span>Počet objednávek: {stat.orderCount}</span>
                                                <span>Celkem objednáno: {stat.totalQuantity} ks</span>
                                                {stat.preferredVolume && <span>Nejčastěji {formatVolumeLabel(stat.preferredVolume)} ({stat.preferredVolumeQuantity} ks)</span>}
                                            </div>
                                        </div>
                                        <div className="shrink-0">{renderCartVolumeControls(product)}</div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                )}

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
                                        {renderCartVolumeControls(product)}
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
