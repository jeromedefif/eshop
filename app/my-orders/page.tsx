'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Package, ShoppingCart, Loader2, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useContext } from 'react';
import { CartContext } from '@/contexts/CartContext';
import { getAllowedVolumes } from '@/lib/product-config';
import CustomerPageState from '@/components/CustomerPageState';
import CustomerPageShell from '@/components/CustomerPageShell';

// Konstanty - velmi minimální změna
const PAGE_SIZE = 5;

const MyOrdersPage = () => {
    const { user, profile } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const cartContext = useContext(CartContext);

    // Minimální nové proměnné pro paginaci
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMoreOrders, setHasMoreOrders] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Zachováváme stejnou strukturu s kontrolou cartContext
    if (!cartContext) {
        return null;
    }

    const { setCartItems } = cartContext;

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

                setOrders(data || []);

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
            setOrders(prevOrders => [...prevOrders, ...(data || [])]);

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
    const handleReorder = async (order: any) => {
        // Kontrola dostupnosti položek
        const unavailableItems = order.order_items.filter((item: any) => !item.product || !item.product.in_stock || item.product.is_archived || !getAllowedVolumes(item.product).includes(String(item.volume)));

        if (unavailableItems.length > 0) {
            // Upozornění na nedostupné položky
            const itemNames = unavailableItems.map((item: any) => item.product?.name || 'smazaný produkt').join(', ');
            alert(`Následující položky již nejsou skladem: ${itemNames}`);

            // Do košíku přidáme pouze dostupné položky
            const newCartItems: {[key: string]: number} = {};
            order.order_items.forEach((item: any) => {
                if (item.product?.in_stock && !item.product.is_archived && getAllowedVolumes(item.product).includes(String(item.volume))) {
                    const key = `${item.product_id}-${item.volume}`;
                    newCartItems[key] = Math.max(item.quantity, item.product.min_order_qty || 1);
                }
            });

            setCartItems(newCartItems);
        } else {
            // Všechny položky jsou dostupné
            const newCartItems: {[key: string]: number} = {};
            order.order_items.forEach((item: any) => {
                const key = `${item.product_id}-${item.volume}`;
                newCartItems[key] = Math.max(item.quantity, item.product?.min_order_qty || 1);
            });
            setCartItems(newCartItems);
        }

        // Přesměrování na souhrn objednávky
        router.push('/order-summary');
    };

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
                    <p className="mt-2 text-sm text-slate-600">Historie objednávek a rychlé vytvoření nové objednávky podle předchozího nákupu.</p>
                </div>

                {orders.length === 0 ? (
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
                                        <button
                                            onClick={() => handleReorder(order)}
                                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800"
                                        >
                                            <ShoppingCart className="h-4 w-4 mr-2" />
                                            Objednat znovu
                                        </button>
                                    </div>

                                    <div className="p-4 sm:p-5">
                                        <h3 className="font-medium text-gray-900 mb-2">Položky objednávky:</h3>
                                        <ul className="space-y-2">
                                            {order.order_items.map((item: any) => (
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
                )}
        </CustomerPageShell>
    );
};

export default MyOrdersPage;
